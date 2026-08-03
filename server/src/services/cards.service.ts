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

/**
 * TASK: tag every track in the merged pool with its primary artist's
 * genres.
 *
 * Steps:
 * 1. Collect the UNIQUE artist IDs across `tracks` (many tracks will
 *    share the same artistId -- you only want to fetch each artist once).
 * 2. Spotify's Get Several Artists endpoint caps out at 50 IDs per call,
 *    so split the unique ID list into chunks of <=50 and call
 *    fetchArtistsByIds once per chunk.
 * 3. Build a lookup (artistId -> genres[]) from every artist object
 *    returned across all chunks.
 * 4. Return a new array where every track from the input also carries
 *    a `genres` field, populated from that lookup by the track's
 *    artistId.
 *
 * Hints:
 * - A Set is the natural tool for step 1 (dedupe artist IDs), the same
 *   way a Map was the natural tool for deduping tracks in mergeTopTracks.
 * - For chunking an array into groups of N, you don't have a built-in
 *   for this -- you'll loop and slice, e.g. array.slice(i, i + 50).
 * - Chunks are independent Spotify calls, so consider how the concurrency
 *   lesson from mergeTopTracks applies here too.
 */
export async function tagTracksWithGenres(
  accessToken: string,
  tracks: RankedTrack[]
): Promise<GenreTaggedTrack[]> {
  throw new Error('not implemented');
}
