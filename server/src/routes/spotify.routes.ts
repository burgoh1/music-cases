import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { randomUUID } from 'crypto';
import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_NONCE_MAX_AGE_MS,
} from '../config.js';

export const spotifyRouter = Router();

spotifyRouter.get('/connect', requireAuth, async (req, res) => {
  // generate random string for spotify nonce
  const serverSpotifyNonce = randomUUID();

  // set string to httpOnly cookie in users browser.
  // sameSite must be 'lax' (not 'strict') because Spotify's redirect back to
  // /callback is a cross-site-initiated top-level navigation - a 'strict'
  // cookie would never make it back to the server.
  res.cookie('serverSpotifyNonce', serverSpotifyNonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SPOTIFY_NONCE_MAX_AGE_MS,
  });

  // set URL parameter key values to try and connect to spotify
  const spotifyParams = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    // read access to a user's top artists and tracks
    scope: 'user-top-read',
    state: serverSpotifyNonce,
  });

  const spotifyUrl = `https://accounts.spotify.com/authorize?${spotifyParams.toString()}`;
  res.status(200).json({ url: spotifyUrl });
});
