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
    throw new Error(`failed to fetch top tracks for ${timeRange}`);
  }

  // cast a type for track, (Spotify wraps the actual track list in an items field)
  const data = (await res.json()) as { items: SpotifyTrackItem[] };

  const ranked: RankedTrack[] = [];
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
