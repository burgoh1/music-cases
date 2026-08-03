import { pool } from '../db.js';
import { getValidSpotifyAccessToken } from '../services/spotify.service.js';
import { mergeTopTracks, tagTracksWithGenres } from '../services/cards.service.js';

const userId = Number(process.argv[2]);
if (!userId) {
  console.error('usage: npx tsx src/scripts/test-cards.ts <userId>');
  process.exit(1);
}

async function main() {
  const accessToken = await getValidSpotifyAccessToken(userId);

  const merged = await mergeTopTracks(accessToken);
  console.log(`merged pool: ${merged.length} unique tracks`);

  const tagged = await tagTracksWithGenres(accessToken, merged);
  console.log(`tagged pool: ${tagged.length} tracks`);
  console.log('sample:', tagged.slice(0, 5));

  const untagged = tagged.filter((t) => t.genres.length === 0);
  console.log(`tracks with zero genres: ${untagged.length}`);

  await pool.end();
}

main().catch((err) => {
  console.error('test-cards failed:', err);
  process.exit(1);
});
