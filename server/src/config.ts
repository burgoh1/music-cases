import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// JWT
export const JWT_ACCESS_SECRET = requireEnv('JWT_ACCESS_SECRET');
export const JWT_REFRESH_SECRET = requireEnv('JWT_REFRESH_SECRET');
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';
// 7days
export const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/*****************************************************************************/

// Spotify
export const SPOTIFY_CLIENT_ID = requireEnv('SPOTIFY_CLIENT_ID');
export const SPOTIFY_CLIENT_SECRET = requireEnv('SPOTIFY_CLIENT_SECRET');
export const SPOTIFY_REDIRECT_URI = requireEnv('SPOTIFY_REDIRECT_URI');
// 10min
export const SPOTIFY_NONCE_MAX_AGE_MS = 10 * 60 * 1000;
/*****************************************************************************/

// Last.fm
export const LASTFM_API_KEY = requireEnv('LASTFM_API_KEY');
