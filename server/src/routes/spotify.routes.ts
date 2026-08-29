import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { getValidSpotifyAccessToken } from '../services/spotify.service.js';

// middleware
import { requireAuth } from '../middleware/auth.middleware.js';
import { refreshCookie } from '../middleware/spotifyRedirect.middleware.js';

import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_NONCE_MAX_AGE_MS,
  SPOTIFY_CLIENT_SECRET,
} from '../config.js';

export const spotifyRouter = Router();

spotifyRouter.get('/connect', requireAuth, async (req, res) => {
  // generate random string for spotify nonce
  const serverSpotifyNonce = randomUUID();

  // set serverSpotifyNonce in httpOnly cookie to users browser
  res.cookie('serverSpotifyNonce', serverSpotifyNonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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
    // forces the authorization prompt to appear every time a user logs in
    // will turn off later ;D
    show_dialog: 'true',
  });

  // dev: provide me with link to test if spotify authorize link works and redirects to provided URL
  const spotifyUrl = `https://accounts.spotify.com/authorize?${spotifyParams.toString()}`;
  res.status(200).json({ url: spotifyUrl });
});

spotifyRouter.get('/callback', refreshCookie, async (req, res) => {
  const { state, code, error } = req.query;

  // if user denies spotify auth, clear nonce from cookies
  if (error) {
    res.clearCookie('serverSpotifyNonce');
    res.status(400).json({ error: 'Spotify authorization was denied' });
    return;
  }

  const cookieNonce = req.cookies.serverSpotifyNonce;
  // check if the nonce stored inside our cookie is the same nonce that came back from spotify redirect
  if (state !== cookieNonce) {
    res.status(401).json({ error: 'invalid nonce' });
    return;
  }
  // if they are the same, clear cookie nonce
  res.clearCookie('serverSpotifyNonce');

  // call spotify token endpoint and set users spotify auth tokens.
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

  // tell compiler that we know what data types we are expecting back from tokenRes.json
  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  if (!tokenRes.ok) {
    res.status(502).json({ error: 'failed to connect Spotify account' });
    return;
  }

  const { access_token, refresh_token, expires_in } = tokenData;
  const setExpireDate = new Date(Date.now() + expires_in * 1000);
  // update users table with spotify auth tokens and info
  await pool.query(
    'UPDATE users SET spotify_access_token = $1, spotify_refresh_token = $2, spotify_token_expires_at = $3 WHERE id = $4',
    [access_token, refresh_token, setExpireDate, req.userId]
  );
  res.status(200).json({ message: 'Spotify connected' });
});

spotifyRouter.get('/top-tracks', requireAuth, async (req, res) => {
  try {
    // wait for updated access token
    const validSpotifyAccessToken = await getValidSpotifyAccessToken(
      req.userId!
    );

    const data = await fetch('https://api.spotify.com/v1/me/top/tracks', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validSpotifyAccessToken}`,
      },
    });
    const spotifyRes = await data.json();

    if (!data.ok) {
      console.error('Spotify top-tracks request failed:', spotifyRes);
      res.status(502).json({ error: 'failed to fetch top tracks' });
      return;
    }

    // console log top tracks for now
    console.log(spotifyRes);
    res.status(200).json({ message: 'check server logs' });
  } catch (error) {
    console.error('Failed to get top tracks:', error);
    res.status(400).json({ error: 'Spotify account not connected' });
  }
});
