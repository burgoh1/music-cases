import { pool } from '../db.js';
import type { RarityTier } from './rarity.service.js';

// Thrown when Spotify rejects a request with 401, distinguishing an
// auth failure (user needs to reconnect Spotify) from any other
// failure (network issue, Spotify outage, etc).
export class SpotifyAuthError extends Error {}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

interface SpotifyTrackItem {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
}

export interface RankedTrack {
  spotifyTrackId: string;
  trackName: string;
  artistId: string;
  artistName: string;
  rank: number; // 1-indexed position within this time_range's response
  timeRange: TimeRange;
}

async function fetchTopTracksForRange(
  accessToken: string,
  timeRange: TimeRange
): Promise<RankedTrack[]> {
  const res = await fetch(
    `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new SpotifyAuthError(
        `spotify auth failed fetching top tracks for ${timeRange}`
      );
    }
    throw new Error(`failed to fetch top tracks for ${timeRange}`);
  }

  const data = (await res.json()) as { items: SpotifyTrackItem[] };

  // a track's primary artist is items[i].artists[0] -- that's the artist
  // whose genres the track will inherit in Lesson 3.
  const ranked: RankedTrack[] = [];
  data.items.forEach((item, index) => {
    const primaryArtist = item.artists[0];
    if (!primaryArtist) return; // skip the rare track with no artist data

    ranked.push({
      spotifyTrackId: item.id,
      trackName: item.name,
      artistId: primaryArtist.id,
      artistName: primaryArtist.name,
      rank: index + 1,
      timeRange,
    });
  });
  return ranked;
}

// Fetches all three time ranges concurrently, then merges them into one
// list deduped by spotifyTrackId. When the same track appears in more
// than one time range, the occurrence with the numerically LOWEST
// (best) rank wins.
export async function mergeTopTracks(
  accessToken: string
): Promise<RankedTrack[]> {
  const shortTerm = fetchTopTracksForRange(accessToken, 'short_term');
  const mediumTerm = fetchTopTracksForRange(accessToken, 'medium_term');
  const longTerm = fetchTopTracksForRange(accessToken, 'long_term');
  const [short, medium, long] = await Promise.all([
    shortTerm,
    mediumTerm,
    longTerm,
  ]);
  const allTracks = [...short, ...medium, ...long];
  const deduped = new Map<string, RankedTrack>();

  for (const track of allTracks) {
    const existing = deduped.get(track.spotifyTrackId);

    if (!existing || track.rank <= existing.rank) {
      deduped.set(track.spotifyTrackId, track);
    }
  }

  return [...deduped.values()];
}

interface SpotifyArtistItem {
  id: string;
  genres: string[];
}

export interface GenreTaggedTrack extends RankedTrack {
  genres: string[];
}

// Calls Spotify's "Get Several Artists" endpoint for ONE batch of artist
// IDs. Spotify caps this endpoint at 50 IDs per call -- this function
// does not enforce or chunk that limit itself, it just fetches whatever
// batch it's given. Chunking a larger ID list into batches of <=50 is
// part of the task below.
async function fetchArtistsByIds(
  accessToken: string,
  artistIds: string[]
): Promise<SpotifyArtistItem[]> {
  const res = await fetch(
    `https://api.spotify.com/v1/artists?ids=${artistIds.join(',')}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new SpotifyAuthError('spotify auth failed fetching artists');
    }
    throw new Error('failed to fetch artists');
  }

  const data = (await res.json()) as { artists: SpotifyArtistItem[] };
  return data.artists;
}

// Tags every track in the merged pool with its primary artist's genres.
// Fetches each unique artist exactly once, batched in groups of <=50
// (Spotify's Get Several Artists limit), then attaches genres back onto
// every track via an artistId -> genres[] lookup.
export async function tagTracksWithGenres(
  accessToken: string,
  tracks: RankedTrack[]
): Promise<GenreTaggedTrack[]> {
  const uniqueArtistIds = [...new Set(tracks.map((track) => track.artistId))];

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueArtistIds.length; i += 50) {
    chunks.push(uniqueArtistIds.slice(i, i + 50));
  }

  const artistInfo = (
    await Promise.all(
      chunks.map((chunk) => fetchArtistsByIds(accessToken, chunk))
    )
  ).flat();

  const genreMap = new Map<string, string[]>();
  for (const artist of artistInfo) {
    genreMap.set(artist.id, artist.genres);
  }

  return tracks.map((track) => ({
    ...track,
    genres: genreMap.get(track.artistId) ?? [],
  }));
}

// Tallies genre occurrences across the genre-tagged pool. A track with
// multiple genres contributes one tally to each of its genres, not
// just its first.
export function countGenreFrequency(
  tracks: GenreTaggedTrack[]
): Map<string, number> {
  const genreCounts = new Map<string, number>();

  for (const track of tracks) {
    for (const genre of track.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  return genreCounts;
}

// Computes the user's top `count` genres by frequency (default 3).
export function getTopGenres(
  tracks: GenreTaggedTrack[],
  count: number = 3
): string[] {
  const genreCounts = countGenreFrequency(tracks);

  return [...genreCounts.entries()]
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, count)
    .map(([genre]) => genre);
}

/**
 * TASK: group genre-tagged tracks into per-genre "case" buckets, one
 * bucket per entry in topGenres.
 *
 * Lesson 6 scope: only handle the UNAMBIGUOUS case. A track whose
 * genres[] contains EXACTLY ONE of the three topGenres goes into that
 * genre's bucket. A track matching zero or multiple topGenres is
 * skipped -- left out of every bucket entirely. Multi-genre conflict
 * resolution (greedy-fill) is Lesson 8's job, not this one; don't pick
 * an arbitrary genre here.
 *
 * Steps:
 * 1. Create an empty bucket (array) for each genre in topGenres.
 * 2. For each track, find which of topGenres appear in its genres[].
 * 3. If there's exactly one match, push the track into that genre's
 *    bucket. Otherwise, skip the track.
 * 4. Return the buckets keyed by genre name.
 *
 * Hints:
 * - A Map<string, GenreTaggedTrack[]> works well here: one entry per
 *   topGenre, each value starting as an empty array.
 * - `topGenres.filter((genre) => track.genres.includes(genre))` gives
 *   you the matching genres for one track -- check its .length.
 */
/**
 * TASK: group genre-tagged tracks into per-genre case buckets, now
 * fully resolving ambiguous (multi-top-genre) tracks via greedy-fill
 * instead of skipping them.
 *
 * Rules (already decided in the spec):
 * - Process tracks in RANK order, best first -- sort a COPY of `tracks`
 *   by rank ascending before assigning anything.
 * - Matches exactly one topGenre: assign there, same as before.
 * - Matches zero topGenres: still skip -- no case wants it.
 * - Matches two or more topGenres: assign to whichever of those
 *   matching buckets CURRENTLY holds the fewest tracks (bucket sizes
 *   change as you go, which is why rank order matters -- earlier
 *   greedy choices affect later ones). If multiple candidates are
 *   tied for fewest, break the tie by whichever genre has the higher
 *   OVERALL frequency across the whole pool.
 *
 * Steps:
 * 1. Sort a copy of `tracks` by rank ascending.
 * 2. Compute genreFrequency = countGenreFrequency(tracks) once, up
 *    front, for the tie-break.
 * 3. Initialize the empty buckets, one per topGenre (as before).
 * 4. Walk the SORTED tracks. For each, find matchingGenres. If 0,
 *    skip. If 1, assign directly. If 2+, pick the smallest matching
 *    bucket right now (tie-break via genreFrequency), then push.
 * 5. Return the buckets.
 *
 * Hints:
 * - "Smallest matching bucket" = among matchingGenres, whichever has
 *   the lowest genreCases.get(genre)!.length at this point in the loop.
 * - A plain loop comparing candidates one at a time works fine for
 *   picking the smallest (with a tie-break fallback to
 *   genreFrequency.get(genre)) -- no need for anything fancier.
 */
export function buildGenreCases(
  tracks: GenreTaggedTrack[],
  topGenres: string[]
): Map<string, GenreTaggedTrack[]> {
  const genreFrequency = countGenreFrequency(tracks);
  const genreCases = new Map<string, GenreTaggedTrack[]>(
    topGenres.map((genre) => [genre, []])
  );
  const sortedTracks = [...tracks].sort(
    (trackA, trackB) => trackA.rank - trackB.rank
  );

  for (const track of sortedTracks) {
    const matchingGenres = topGenres.filter((genre) =>
      track.genres.includes(genre)
    );

    let selectedGenre: string | undefined;
    let smallestBucketSize = Infinity;
    let highestFrequency = -Infinity;

    for (const genre of matchingGenres) {
      const bucket = genreCases.get(genre);
      if (bucket === undefined) {
        continue;
      }

      const frequency = genreFrequency.get(genre) ?? 0;
      if (
        bucket.length < smallestBucketSize ||
        (bucket.length === smallestBucketSize && frequency > highestFrequency)
      ) {
        selectedGenre = genre;
        smallestBucketSize = bucket.length;
        highestFrequency = frequency;
      }
    }

    if (selectedGenre !== undefined) {
      const selectedBucket = genreCases.get(selectedGenre);
      if (selectedBucket !== undefined) {
        selectedBucket.push(track);
      }
    }
  }

  return genreCases;
}

/**
 * TASK: replace any case bucket that can't clear a 5-song floor with a
 * new bucket built from the user's 4th-ranked genre.
 *
 * Rules (per spec):
 * - "Can't clear the floor" means bucket.length < 5.
 * - A failing bucket isn't padded and doesn't keep its label -- it's
 *   discarded outright and replaced by a brand-new bucket keyed to
 *   `fourthGenre`.
 * - The substitute bucket is built from tracks NOT already assigned to
 *   any of the OTHER (surviving) buckets, whose genres[] includes
 *   fourthGenre. Tracks already sitting in a healthy bucket stay put --
 *   this never steals from a bucket that already cleared the floor.
 * - This only needs to handle ONE failing bucket. More than one
 *   bucket failing at once (or the substitute itself failing) is a
 *   rarer edge-case-of-edge-case this MVP doesn't need to solve.
 *
 * Steps:
 * 1. Build a Set of every spotifyTrackId already assigned across ALL
 *    of genreCases' current buckets.
 * 2. Find a bucket in genreCases with fewer than 5 tracks (if none,
 *    return genreCases unchanged).
 * 3. Delete that failing bucket's entry from the map.
 * 4. Add a new entry keyed by fourthGenre: every track in `allTracks`
 *    that is NOT in the assigned-ID set from step 1 AND has
 *    fourthGenre in its genres[].
 * 5. Return the modified map.
 */
export function applyGenreSubstitution(
  genreCases: Map<string, GenreTaggedTrack[]>,
  allTracks: GenreTaggedTrack[],
  fourthGenre: string
): Map<string, GenreTaggedTrack[]> {
  const assignedTrackIds = new Set<string>();
  for (const caseTracks of genreCases.values()) {
    for (const track of caseTracks) {
      assignedTrackIds.add(track.spotifyTrackId);
    }
  }

  let failingGenre: string | undefined;
  for (const [genre, caseTracks] of genreCases) {
    if (caseTracks.length < 5) {
      failingGenre = genre;
      break;
    }
  }

  if (failingGenre === undefined) {
    return genreCases;
  }

  genreCases.delete(failingGenre);

  const substituteTracks = allTracks.filter(
    (track) =>
      !assignedTrackIds.has(track.spotifyTrackId) &&
      track.genres.includes(fourthGenre)
  );
  genreCases.set(fourthGenre, substituteTracks);

  return genreCases;
}

export interface CardInsertRow {
  userId: number;
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  rank: number;
  timeRange: TimeRange;
  genres: string[];
  rarity: RarityTier;
  caseGenre: string;
}

/**
 * TASK: bulk-insert all generated cards for a user in a single query.
 *
 * Columns, in order: user_id, spotify_track_id, track_name,
 * artist_name, rank, time_range, genres, rarity, case_genre (9 columns).
 *
 * Steps:
 * 1. If `rows` is empty, return immediately -- nothing to insert.
 * 2. Build a parameterized multi-row INSERT: one VALUES group per row,
 *    e.g. ($1,$2,...,$9), ($10,$11,...,$18), ... one group per row in
 *    `rows`, joined with commas.
 * 3. Flatten every row's values, in the same column order as the
 *    placeholders, into a single flat array to pass as the query's
 *    parameters.
 * 4. Run it with pool.query(sql, values).
 *
 * Hints:
 * - Each row needs 9 placeholders. For row index i (0-based), its
 *   placeholders start at (i * 9) + 1 -- e.g. row 0 is $1..$9, row 1
 *   is $10..$18.
 * - Build an array of placeholder-group strings (one per row), then
 *   .join(', ') them into the VALUES clause of your SQL string.
 * - The flat params array must list every row's 9 values back-to-back,
 *   in the exact order your placeholders reference them.
 */
export async function insertCards(rows: CardInsertRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const columnCount = 9;
  const valueGroups = rows.map((_, rowIndex) => {
    const firstPlaceholder = rowIndex * columnCount + 1;
    const placeholders = Array.from(
      { length: columnCount },
      (_, columnIndex) => `$${firstPlaceholder + columnIndex}`
    );
    return `(${placeholders.join(', ')})`;
  });

  const values = rows.flatMap((row) => [
    row.userId,
    row.spotifyTrackId,
    row.trackName,
    row.artistName,
    row.rank,
    row.timeRange,
    row.genres,
    row.rarity,
    row.caseGenre,
  ]);

  const sql = `
    INSERT INTO cards (
      user_id, spotify_track_id, track_name, artist_name, rank,
      time_range, genres, rarity, case_genre
    ) VALUES ${valueGroups.join(', ')}
  `;

  await pool.query(sql, values);
}

export interface CardRow {
  id: number;
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  rank: number;
  timeRange: TimeRange;
  genres: string[];
  rarity: RarityTier;
  caseGenre: string;
}

// Fetches every card generated for a user, ordered by case then rank.
export async function getCardsForUser(userId: number): Promise<CardRow[]> {
  const result = await pool.query<CardRow>(
    `SELECT
       id,
       spotify_track_id AS "spotifyTrackId",
       track_name AS "trackName",
       artist_name AS "artistName",
       rank,
       time_range AS "timeRange",
       genres,
       rarity,
       case_genre AS "caseGenre"
     FROM cards
     WHERE user_id = $1
     ORDER BY case_genre, rank`,
    [userId]
  );
  return result.rows;
}

export interface PoolSummary {
  totalCards: number;
  byRarity: Record<RarityTier, CardRow[]>;
  byGenreCase: Record<string, { count: number; cards: CardRow[] }>;
}

/**
 * TASK: reshape a flat CardRow[] into the two grouped views the
 * /my-pool endpoint needs.
 *
 * byRarity: one entry per RarityTier ('Legendary', 'Epic', 'Rare'),
 * each holding every card with that rarity. Since RarityTier only ever
 * has those 3 possible values, initialize all 3 keys up front (with
 * empty arrays) rather than discovering them dynamically -- unlike
 * genre names, you already know exactly what they are.
 *
 * byGenreCase: one entry per distinct caseGenre value actually present
 * in `cards`, each holding both a running count and the matching
 * cards. Genre names aren't fixed like rarity tiers, so build these
 * keys dynamically as you encounter them (same pattern as the Map you
 * used in getTopGenres, just building an object instead and now
 * collecting full cards, not only a count).
 *
 * Steps:
 * 1. Initialize byRarity with all 3 tiers mapped to empty arrays.
 * 2. Initialize byGenreCase as an empty object.
 * 3. Walk `cards` once: for each card, push it into the right
 *    byRarity bucket, and into byGenreCase[card.caseGenre] -- creating
 *    that entry (count: 0, cards: []) the first time a given
 *    caseGenre is seen, then incrementing count and pushing the card.
 * 4. Return { totalCards: cards.length, byRarity, byGenreCase }.
 */
export function groupCardsForSummary(cards: CardRow[]): PoolSummary {
  const byRarity: Record<RarityTier, CardRow[]> = {
    Legendary: [],
    Epic: [],
    Rare: [],
  };
  const byGenreCase: Record<string, { count: number; cards: CardRow[] }> = {};

  for (const card of cards) {
    byRarity[card.rarity].push(card);

    let genreCase = byGenreCase[card.caseGenre];
    if (genreCase === undefined) {
      genreCase = { count: 0, cards: [] };
      byGenreCase[card.caseGenre] = genreCase;
    }

    genreCase.count += 1;
    genreCase.cards.push(card);
  }

  return { totalCards: cards.length, byRarity, byGenreCase };
}

/**
 * TASK: check whether a user already has a generated pool.
 *
 * Steps:
 * 1. Query for any row in `cards` with this user_id (you only need to
 *    know if at least one exists -- LIMIT 1 is enough, no need to
 *    fetch or count everything).
 * 2. Return true if a row was found, false otherwise.
 *
 * Hint: pool.query's result has a `rowCount` field telling you how
 * many rows came back.
 */
export async function hasExistingPool(userId: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM cards WHERE user_id = $1 LIMIT 1',
    [userId]
  );

  return (result.rowCount ?? 0) > 0;
}
