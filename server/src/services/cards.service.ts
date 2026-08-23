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
