import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getValidSpotifyAccessToken } from '../services/spotify.service.js';
import { assignRarity } from '../services/rarity.service.js';
import {
  mergeTopTracks,
  tagTracksWithGenres,
  getTopGenres,
  buildGenreCases,
  insertCards,
  type CardInsertRow,
} from '../services/cards.service.js';

export const cardsRouter = Router();

cardsRouter.post('/generate-pool', requireAuth, async (req, res) => {
  try {
    const accessToken = await getValidSpotifyAccessToken(req.userId!);

    const merged = await mergeTopTracks(accessToken);
    const tagged = await tagTracksWithGenres(accessToken, merged);
    const topGenres = getTopGenres(tagged);
    const genreCases = buildGenreCases(tagged, topGenres);

    const rows: CardInsertRow[] = [];
    for (const [genre, caseTracks] of genreCases) {
      const rankedCase = assignRarity(caseTracks);
      for (const track of rankedCase) {
        rows.push({
          userId: req.userId!,
          spotifyTrackId: track.spotifyTrackId,
          trackName: track.trackName,
          artistName: track.artistName,
          rank: track.rank,
          timeRange: track.timeRange,
          genres: track.genres,
          rarity: track.rarity,
          caseGenre: genre,
        });
      }
    }

    await insertCards(rows);
    res.status(201).json({ message: 'pool generated', cardCount: rows.length });
  } catch (error) {
    console.error('Failed to generate pool:', error);
    res.status(500).json({ error: 'failed to generate pool' });
  }
});
