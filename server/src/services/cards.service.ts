import { pool } from '../db.js';
import type { RarityTier } from './rarity.service.js';

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

// Computes the user's top 3 genres by frequency across the genre-tagged
// pool. A track with multiple genres contributes one tally to each of
// its genres, not just its first.
export function getTopGenres(tracks: GenreTaggedTrack[]): string[] {
  const genreCounts = new Map<string, number>();

  for (const track of tracks) {
    for (const genre of track.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  return [...genreCounts.entries()]
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 3)
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
export function buildGenreCases(
  tracks: GenreTaggedTrack[],
  topGenres: string[]
): Map<string, GenreTaggedTrack[]> {
  const genreCases = new Map<string, GenreTaggedTrack[]>(
    topGenres.map((genre) => [genre, []])
  );

  for (const track of tracks) {
    const matchingGenres = topGenres.filter((genre) =>
      track.genres.includes(genre)
    );

    const matchingGenre = matchingGenres[0];
    if (matchingGenres.length === 1 && matchingGenre !== undefined) {
      const caseTracks = genreCases.get(matchingGenre);
      if (caseTracks !== undefined) {
        caseTracks.push(track);
      }
    }
  }

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
  throw new Error('not implemented');
}
