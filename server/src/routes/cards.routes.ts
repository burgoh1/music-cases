import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getValidSpotifyAccessToken } from '../services/spotify.service.js';
import { assignRarity } from '../services/rarity.service.js';
import {
  mergeTopTracks,
  tagTracksWithGenres,
  getTopGenres,
  buildGenreCases,
  applyGenreSubstitution,
  insertCards,
  getCardsForUser,
  groupCardsForSummary,
  hasExistingPool,
  SpotifyAuthError,
  type CardInsertRow,
} from '../services/cards.service.js';

export const cardsRouter = Router();

cardsRouter.post('/generate-pool', requireAuth, async (req, res) => {
  try {
    if (await hasExistingPool(req.userId!)) {
      res.status(409).json({ error: 'pool already generated for this user' });
      return;
    }

    const accessToken = await getValidSpotifyAccessToken(req.userId!);

    const merged = await mergeTopTracks(accessToken);
    const tagged = await tagTracksWithGenres(accessToken, merged);
    const topFourGenres = getTopGenres(tagged, 4);
    const topGenres = topFourGenres.slice(0, 3);
    const fourthGenre = topFourGenres[3];

    let genreCases = buildGenreCases(tagged, topGenres);
    if (fourthGenre) {
      genreCases = applyGenreSubstitution(genreCases, tagged, fourthGenre);
    }

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
    if (error instanceof SpotifyAuthError) {
      res
        .status(401)
        .json({ error: 'Spotify authorization expired, please reconnect' });
      return;
    }
    console.error('Failed to generate pool:', error);
    res.status(500).json({ error: 'failed to generate pool' });
  }
});

cardsRouter.get('/my-pool', requireAuth, async (req, res) => {
  try {
    const cards = await getCardsForUser(req.userId!);
    const summary = groupCardsForSummary(cards);
    res.status(200).json(summary);
  } catch (error) {
    console.error('Failed to fetch pool:', error);
    res.status(500).json({ error: 'failed to fetch pool' });
  }
});
