import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { getValidSpotifyAccessToken } from '../services/spotify.service.js';

// middleware
import { requireAuth } from '../middleware/auth.middleware.js';
import { refreshCookie } from '../middleware/spotifyRedirect.middleware.js';

import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
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
    // forces the authorization prompt to appear every time (useful for
    // testing repeatedly during dev - Spotify skips it silently once
    // you've approved this app before)
    show_dialog: 'true',
  });

  const spotifyUrl = `https://accounts.spotify.com/authorize?${spotifyParams.toString()}`;
  res.status(200).json({ url: spotifyUrl });
});

spotifyRouter.get('/callback', refreshCookie, async (req, res) => {
  const { state, code, error } = req.query;

  if (error) {
    res.clearCookie('serverSpotifyNonce');
    res.status(400).json({ error: 'Spotify authorization was denied' });
    return;
  }

  const cookieNonce = req.cookies.serverSpotifyNonce;
  if (!cookieNonce || state !== cookieNonce) {
    res.status(401).json({ error: 'invalid nonce' });
    return;
  }
  res.clearCookie('serverSpotifyNonce');

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code as string,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  });

  const basicAuth = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
    },
    body: params,
  });

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  if (!tokenRes.ok) {
    console.error('Spotify token exchange failed:', tokenData);
    res.status(502).json({ error: 'failed to connect Spotify account' });
    return;
  }

  const { access_token, refresh_token, expires_in } = tokenData;
  const expiresAt = new Date(Date.now() + expires_in * 1000);

  await pool.query(
    'UPDATE users SET spotify_access_token = $1, spotify_refresh_token = $2, spotify_token_expires_at = $3 WHERE id = $4',
    [access_token, refresh_token, expiresAt, req.userId]
  );
  res.status(200).json({ message: 'Spotify connected' });
});

spotifyRouter.get('/top-tracks', requireAuth, async (req, res) => {
  try {
    const validSpotifyAccessToken = await getValidSpotifyAccessToken(
      req.userId!
    );

    const topTracksRes = await fetch(
      'https://api.spotify.com/v1/me/top/tracks',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validSpotifyAccessToken}`,
        },
      }
    );

    const spotifyRes = await topTracksRes.json();

    if (!topTracksRes.ok) {
      console.error('Spotify top-tracks request failed:', spotifyRes);
      res.status(502).json({ error: 'failed to fetch top tracks' });
      return;
    }

    // this console.log is the whole point of this route for now - it just
    // proves the auth -> token refresh -> Spotify API chain works end to end.
    console.log(spotifyRes);
    res.status(200).json({ message: 'check server logs' });
  } catch (err) {
    console.error('Failed to get top tracks:', err);
    res.status(400).json({ error: 'Spotify account not connected' });
  }
});
