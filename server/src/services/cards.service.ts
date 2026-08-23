import { pool } from '../db.js';
import type { RarityTier } from './rarity.service.js';

// Thrown when Spotify rejects a request with 401 (user needs to reconnect Spotify)
export class SpotifyAuthError extends Error {}

// valid time ranges for spotify api endpoint preventing fetching errors
type TimeRange = 'short_term' | 'medium_term' | 'long_term';

// object shape for each track from spotify api
interface SpotifyTrackItem {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
}

// object shape for each track to work with
export interface RankedTrack {
  spotifyTrackId: string;
  trackName: string;
  artistId: string;
  artistName: string;
  rank: number;
  timeRange: TimeRange;
}

async function fetchTopTracksForRange(
  accessToken: string,
  timeRange: TimeRange
): Promise<RankedTrack[]> {
  // call spotify api top track list based on time range
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

  // cast a type for track
  const data = (await res.json()) as { items: SpotifyTrackItem[] };

  const ranked: RankedTrack[] = [];
  // Spotify wraps the actual track list in an items field
  data.items.forEach((item, index) => {
    // each track can have multiple artists, we only want the primary artist
    const primaryArtist = item.artists[0];

    // skip tracks with no artist data
    if (!primaryArtist) {
      return;
    }

    // build new object with RankedTrack shape
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

export async function mergeTopTracks(
  accessToken: string
): Promise<RankedTrack[]> {
  // fetch all three time ranges
  const shortTerm = fetchTopTracksForRange(accessToken, 'short_term');
  const mediumTerm = fetchTopTracksForRange(accessToken, 'medium_term');
  const longTerm = fetchTopTracksForRange(accessToken, 'long_term');
  const [short, medium, long] = await Promise.all([
    shortTerm,
    mediumTerm,
    longTerm,
  ]);

  // merge them into a single list
  const allTracks = [...short, ...medium, ...long];

  // deduped by spotifyTrackId
  const deduped = new Map<string, RankedTrack>();
  for (const track of allTracks) {
    // grabs any existing tracks in deduped with the same spotifyTrackId
    const existing = deduped.get(track.spotifyTrackId);

    if (!existing) {
      // set track in deduped if first time seeing track
      deduped.set(track.spotifyTrackId, track);
    } else {
      // set best ranked track in deduped
      if (track.rank <= existing.rank) {
        deduped.set(track.spotifyTrackId, track);
      }
    }
  }

  return [...deduped.values()];
}

// object shape for each artist from spotify api
interface SpotifyArtistItem {
  id: string;
  genres: string[];
}

// object shape for each track plus genres field
export interface GenreTaggedTrack extends RankedTrack {
  genres: string[];
}

async function fetchArtistsByIds(
  accessToken: string,
  artistIds: string[]
): Promise<SpotifyArtistItem[]> {
  // Calls Spotify's "Get Several Artists" endpoint for ONE batch of artist
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

  // cast a type for artist
  const data = (await res.json()) as { artists: SpotifyArtistItem[] };
  return data.artists;
}

export async function tagTracksWithGenres(
  accessToken: string,
  tracks: RankedTrack[]
): Promise<GenreTaggedTrack[]> {
  // array of unique artist ids
  const uniqueArtistIds = [...new Set(tracks.map((track) => track.artistId))];

  // each item in the chunks array is an array of 50 or less artistIds
  const chunks: string[][] = [];
  // chunk into groups of 50 for spotify's hard limit of 50 ids per call
  for (let i = 0; i < uniqueArtistIds.length; i += 50) {
    chunks.push(uniqueArtistIds.slice(i, i + 50));
  }

  // fetch each chunk
  const artistInfo = (
    await Promise.all(
      chunks.map((chunk) => fetchArtistsByIds(accessToken, chunk))
    )
  ).flat(); // return as a single array

  // each artist is assigned a genre value
  const genreMap = new Map<string, string[]>();
  for (const artist of artistInfo) {
    genreMap.set(artist.id, artist.genres);
  }

  // return array of tracks with genre field added
  return tracks.map((track) => ({
    ...track,
    genres: genreMap.get(track.artistId) ?? [],
  }));
}

// compute the user's top 3 genres by frequency across the
export function getTopGenres(tracks: GenreTaggedTrack[]): string[] {
  const genreCounts = new Map<string, number>();

  for (const track of tracks) {
    // every genre in a track's array counts as one occurrence
    for (const genre of track.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  return [...genreCounts.entries()]
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 3)
    .map(([genre]) => genre);
}

// group genre tagged tracks into a genre bucket, three buckets in topGenres
export function buildGenreCases(
  tracks: GenreTaggedTrack[],
  topGenres: string[]
): Map<string, GenreTaggedTrack[]> {
  // map with one empty track array for each genre
  const genreCases = new Map<string, GenreTaggedTrack[]>(
    topGenres.map((genre) => [genre, []])
  );

  for (const track of tracks) {
    // finds which top genres belong to the current track
    const matchingGenres = topGenres.filter((genre) =>
      track.genres.includes(genre)
    );

    // continue only if exactly one top genre matches
    const matchingGenre = matchingGenres[0];
    if (matchingGenres.length === 1 && matchingGenre !== undefined) {
      // gets that genre's array from the map and adds the track to it
      const caseTracks = genreCases.get(matchingGenre);
      if (caseTracks !== undefined) {
        caseTracks.push(track);
      }
    }
  }

  // completed set of genre case buckets
  return genreCases;
}

// for database
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

// insert all generated cards for a user in a single query
export async function insertCards(rows: CardInsertRow[]): Promise<void> {
  // returns immediately when there are no cards, prevents invalid sql query
  if (rows.length === 0) {
    return;
  }

  const columnCount = 9;
  // sql placeholder for each card row
  const valueGroups = rows.map((_, rowIndex) => {
    // works out where this row’s numbered parameters begin
    const firstPlaceholder = rowIndex * columnCount + 1;
    // creates the nine placeholders for a row ($1-$9)
    const placeholders = Array.from(
      { length: columnCount },
      (_, columnIndex) => `$${firstPlaceholder + columnIndex}`
    );

    // turns them into sql
    return `(${placeholders.join(', ')})`;
  });

  // flat array of values in the same order as the sql columns and placeholders
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

  // complete sql statement that safely handles values
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

// reshapes a flat CardRow[] into the two grouped views the /my-pool endpoint needs
export function groupCardsForSummary(cards: CardRow[]): PoolSummary {
  // view rarity distribution
  const byRarity: Record<RarityTier, CardRow[]> = {
    Legendary: [],
    Epic: [],
    Rare: [],
  };
  // view track distribution per top genre
  const byGenreCase: Record<string, { count: number; cards: CardRow[] }> = {};

  for (const card of cards) {
    // use card rarity as obj key and append to corresponding rarity array
    byRarity[card.rarity].push(card);

    // looks for card's genre case
    let genreCase = byGenreCase[card.caseGenre];
    // creates genre case group the first time that genre is seen
    if (genreCase === undefined) {
      genreCase = { count: 0, cards: [] };
      byGenreCase[card.caseGenre] = genreCase;
    }

    genreCase.count += 1;
    genreCase.cards.push(card);
  }

  return { totalCards: cards.length, byRarity, byGenreCase };
}

// check whether a user already has a generated pool
export async function hasExistingPool(userId: number): Promise<boolean> {
  // search cards table for one placeholder value
  const result = await pool.query(
    'SELECT 1 FROM cards WHERE user_id = $1 LIMIT 1',
    [userId]
  );

  // 1 = pool exists. 2 = pool does not exist.
  return (result.rowCount ?? 0) > 0;
}
