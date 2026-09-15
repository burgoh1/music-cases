import { pool } from '../db.js';
import { SpotifyAuthError } from './cards.service.js';

// object shape for one artist from spotify's "Several Artists" endpoint
interface SpotifyArtistItem {
  id: string;
  images: { url: string; width: number; height: number }[];
}

// picks the largest image (by width) from an artist's images array, or null if empty
function pickLargestImage(
  images: { url: string; width: number }[]
): string | null {
  if (images.length === 0) {
    return null;
  }
  return images.reduce((largest, img) =>
    img.width > largest.width ? img : largest
  ).url;
}

// splits an array into chunks of at most `size` items
function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// batch-fetches artist images from spotify, chunked into groups of up to 50 ids
// (spotify's max for the several-artists endpoint)
async function fetchArtistImagesFromSpotify(
  accessToken: string,
  artistIds: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  for (const idsChunk of chunk(artistIds, 50)) {
    const res = await fetch(
      `https://api.spotify.com/v1/artists?ids=${idsChunk.join(',')}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      if (res.status === 401) {
        throw new SpotifyAuthError(
          'spotify auth failed fetching artist images'
        );
      }
      // one batch failing shouldn't fail the whole pool, just log and move on.
      // these artists stay uncached and get retried on a future pool generation.
      console.error('Spotify artist image batch fetch failed:', res.status);
      continue;
    }

    const data = (await res.json()) as { artists: (SpotifyArtistItem | null)[] };
    for (const artist of data.artists) {
      if (artist) {
        results.set(artist.id, pickLargestImage(artist.images));
      }
    }
  }

  return results;
}

// checks the shared cache first, only hits spotify for artists not yet cached,
// then bulk-caches the results (including "no image found" as a cached negative
// result, same idea as how artist_genre_cache handles "no genres")
export async function ensureArtistImagesCached(
  accessToken: string,
  artistIds: string[]
): Promise<void> {
  const uniqueIds = [...new Set(artistIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const cached = await pool.query<{ artist_id: string }>(
    'SELECT artist_id FROM artist_image_cache WHERE artist_id = ANY($1)',
    [uniqueIds]
  );
  const cachedIds = new Set(cached.rows.map((row) => row.artist_id));
  const missingIds = uniqueIds.filter((id) => !cachedIds.has(id));
  if (missingIds.length === 0) {
    return;
  }

  const fetched = await fetchArtistImagesFromSpotify(accessToken, missingIds);

  const rows = missingIds.map((id) => [id, fetched.get(id) ?? null] as const);
  const valueGroups = rows.map(
    (_, rowIndex) => `($${rowIndex * 2 + 1}, $${rowIndex * 2 + 2})`
  );
  const values = rows.flatMap(([id, url]) => [id, url]);

  await pool.query(
    `INSERT INTO artist_image_cache (artist_id, image_url) VALUES ${valueGroups.join(', ')}
     ON CONFLICT (artist_id) DO NOTHING`,
    values
  );
}
