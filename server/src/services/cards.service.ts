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
  return data.items.map((item, index) => ({
    spotifyTrackId: item.id,
    trackName: item.name,
    artistId: item.artists[0].id,
    artistName: item.artists[0].name,
    rank: index + 1,
    timeRange,
  }));
}

/**
 * TASK: fetch all three time ranges and merge them into a single list,
 * deduped by spotifyTrackId.
 *
 * Decided tie-break rule: if the same track appears in more than one
 * time range, keep whichever occurrence has the numerically LOWEST
 * (best) rank, along with that occurrence's timeRange.
 *
 * Hints:
 * - Use Promise.all to fire off the three fetchTopTracksForRange calls
 *   concurrently rather than awaiting them one at a time.
 * - A Map keyed by spotifyTrackId is a natural way to dedupe in one pass:
 *   for each track, if it's not in the map yet, add it; if it IS already
 *   in the map, compare ranks and keep whichever is lower.
 */
export async function mergeTopTracks(
  accessToken: string
): Promise<RankedTrack[]> {
  throw new Error('not implemented');
}
