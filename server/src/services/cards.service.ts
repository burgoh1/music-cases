type TimeRange = 'short_term' | 'medium_term' | 'long_term';

const TIME_RANGES: TimeRange[] = ['short_term', 'medium_term', 'long_term'];

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

/**
 * TASK: compute the user's top 3 genres by frequency across the
 * genre-tagged pool.
 *
 * A track can carry multiple genres (genres: string[]) -- every genre
 * in a track's array counts as one occurrence toward that genre's
 * tally. A track with 2 genres contributes to 2 different counts, not
 * just one.
 *
 * Steps:
 * 1. Walk every track, and every genre within each track's genres[],
 *    building a running count per genre string.
 * 2. Sort the counted genres by count, descending.
 * 3. Return the top 3 genre names.
 *
 * Hints:
 * - A Map<string, number> is the natural structure for step 1: for each
 *   genre string encountered, if it's not in the map yet set it to 1,
 *   otherwise increment the existing count.
 * - You'll need two nested loops (or a loop + a forEach) since you're
 *   iterating tracks, then within each track iterating its genres[].
 * - For step 2, turning a Map into a sortable array of [genre, count]
 *   pairs is done with Array.from(map.entries()) or [...map.entries()].
 */
export function getTopGenres(tracks: GenreTaggedTrack[]): string[] {
  throw new Error('not implemented');
}
