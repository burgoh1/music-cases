import { pool } from '../db.js';
import { LASTFM_API_KEY } from '../config.js';
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

// object shape for each track plus genres field
export interface GenreTaggedTrack extends RankedTrack {
  genres: string[];
}

// last.fm's raw tags are crowd-sourced, only these count as real genres
const GENRE_ALLOWLIST = new Set([
  'pop', 'rock', 'hip hop', 'hip-hop', 'rap', 'r&b', 'soul', 'country',
  'electronic', 'dance', 'house', 'techno', 'trance', 'dubstep', 'edm',
  'indie', 'indie rock', 'indie pop', 'alternative', 'alternative rock',
  'punk', 'pop punk', 'punk rock', 'metal', 'heavy metal', 'death metal',
  'metalcore', 'folk', 'jazz', 'blues', 'classical', 'latin', 'reggae',
  'reggaeton', 'funk', 'disco', 'gospel', 'ambient', 'synthpop', 'new wave',
  'grunge', 'emo', 'trap', 'drill', 'lo-fi', 'americana', 'bluegrass',
  'singer-songwriter', 'k-pop', 'world', 'ska',
]);

// object shape for one last.fm top tag
interface LastFmTag {
  name: string;
}

// runs up to `limit` promises at once instead of all-at-once or one-at-a-time
async function runWithLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  // pulls the next item off the shared queue until nothing is left
  async function runNext(): Promise<void> {
    const i = nextIndex++;
    const item = items[i];
    if (item === undefined) return;
    results[i] = await worker(item);
    return runNext();
  }

  // starts `limit` workers all pulling from the same queue
  const workers = Array.from({ length: Math.min(limit, items.length) }, runNext);
  await Promise.all(workers);
  return results;
}

// looks up an artist's top tags on last.fm, keeps only real genres
async function fetchArtistGenreTags(artistName: string): Promise<string[]> {
  const params = new URLSearchParams({
    method: 'artist.gettoptags',
    artist: artistName,
    api_key: LASTFM_API_KEY,
    format: 'json',
    autocorrect: '1',
  });

  const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
  if (!res.ok) {
    // one artist failing shouldn't fail the whole pool, just log and move on
    console.error('Last.fm tag lookup failed:', artistName, res.status);
    return [];
  }

  // cast a type for the tag list
  const data = (await res.json()) as { toptags?: { tag: LastFmTag[] } };
  const rawTags = data.toptags?.tag ?? [];

  // filters raw tags down to only ones in our genre allowlist
  return rawTags
    .map((tag) => tag.name.toLowerCase())
    .filter((tag) => GENRE_ALLOWLIST.has(tag));
}

export async function tagTracksWithGenres(
  tracks: RankedTrack[]
): Promise<GenreTaggedTrack[]> {
  // unique artist names since last.fm looks up by name, not spotify id
  const uniqueArtistNames = [
    ...new Set(tracks.map((track) => track.artistName)),
  ];

  // caps concurrent last.fm requests instead of firing them all at once
  const genreResults = await runWithLimit(
    uniqueArtistNames,
    5,
    async (artistName) => [artistName, await fetchArtistGenreTags(artistName)] as const
  );

  // each artist is assigned a genre value
  const genreMap = new Map<string, string[]>(genreResults);

  // return array of tracks with genre field added
  return tracks.map((track) => ({
    ...track,
    genres: genreMap.get(track.artistName) ?? [],
  }));
}

// Tallies genre occurrences across the genre tagged pool
export function countGenreFrequency(
  tracks: GenreTaggedTrack[]
): Map<string, number> {
  const genreCounts = new Map<string, number>();

  for (const track of tracks) {
    // multiple genres contributes one tally to each of its genres
    for (const genre of track.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  return genreCounts;
}

// compute the user's top three genres by frequency
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

// group tracks into genre case buckets
export function buildGenreCases(
  tracks: GenreTaggedTrack[],
  topGenres: string[]
): Map<string, GenreTaggedTrack[]> {
  // counts every genre across full track pool once
  const genreFrequency = countGenreFrequency(tracks);
  // creates empty bucket for top genres
  const genreCases = new Map<string, GenreTaggedTrack[]>(
    topGenres.map((genre) => [genre, []])
  );
  // sort tracks by accending order
  const sortedTracks = [...tracks].sort(
    (trackA, trackB) => trackA.rank - trackB.rank
  );

  // for each track find which of the top genres appear in its genre list
  for (const track of sortedTracks) {
    const matchingGenres = topGenres.filter((genre) =>
      track.genres.includes(genre)
    );

    // sets up values used to choose the bucket
    let selectedGenre: string | undefined;
    let smallestBucketSize = Infinity;
    let highestFrequency = -Infinity;

    // loops over just the genres that match this track
    for (const genre of matchingGenres) {
      // gets each matching bucket
      const bucket = genreCases.get(genre);
      if (bucket === undefined) {
        continue;
      }

      // how many tallies of each genre
      const frequency = genreFrequency.get(genre) ?? 0;
      if (
        // bucket has fewer cards than the current best candidate
        bucket.length < smallestBucketSize ||
        // bucket is tied for fewest cards but the genre is more frequent overall
        (bucket.length === smallestBucketSize && frequency > highestFrequency)
      ) {
        // records the best candidate so far
        selectedGenre = genre;
        smallestBucketSize = bucket.length;
        highestFrequency = frequency;
      }
    }

    // add track to chosen bucket
    if (selectedGenre !== undefined) {
      const selectedBucket = genreCases.get(selectedGenre);
      if (selectedBucket !== undefined) {
        selectedBucket.push(track);
      }
    }
  }

  return genreCases;
}

// replace any case bucket that cant clear a 5 song floor
// with a new bucket built from the user's 4th ranked genre
export function applyGenreSubstitution(
  genreCases: Map<string, GenreTaggedTrack[]>,
  allTracks: GenreTaggedTrack[],
  fourthGenre: string
): Map<string, GenreTaggedTrack[]> {
  const assignedTrackIds = new Set<string>();
  // records the ID of every already assigned track
  for (const caseTracks of genreCases.values()) {
    for (const track of caseTracks) {
      assignedTrackIds.add(track.spotifyTrackId);
    }
  }

  // finds the first genre case bucket containing fewer than five tracks
  let failingGenre: string | undefined;
  for (const [genre, caseTracks] of genreCases) {
    if (caseTracks.length < 5) {
      failingGenre = genre;
      break;
    }
  }

  // return if every bucket has at least 5 tracks
  if (failingGenre === undefined) {
    return genreCases;
  }

  // remove undersized genre bucket
  genreCases.delete(failingGenre);

  // replacement case includes nonassigned tracks for 4th ranked genre
  const substituteTracks = allTracks.filter(
    (track) =>
      !assignedTrackIds.has(track.spotifyTrackId) &&
      track.genres.includes(fourthGenre)
  );
  genreCases.set(fourthGenre, substituteTracks);

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
