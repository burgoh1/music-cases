import { pool } from '../db.js';
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '../config.js';

export async function getValidSpotifyAccessToken(
  userId: number
): Promise<string> {
  const spotifyTokenInfoFromDB = await pool.query(
    'SELECT spotify_access_token, spotify_refresh_token, spotify_token_expires_at FROM users WHERE id = $1',
    [userId]
  );

  const user = spotifyTokenInfoFromDB.rows[0];
  if (!user || !user.spotify_refresh_token) {
    throw new Error('this user hasnt connected Spotify yet');
  }

  const now = new Date();
  const expiresAt = new Date(user.spotify_token_expires_at);

  // comparing the current time with our spotify access token expiration date
  if (now > expiresAt) {
    // if access token is expired, call spotify token endpoint and set users spotify auth tokens.
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.spotify_refresh_token,
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
      refresh_token?: string;
      expires_in: number;
    };

    if (!tokenRes.ok) {
      throw new Error('failed to connect to spotify account');
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const setExpireDate = new Date(Date.now() + expires_in * 1000);
    // only update refresh token when our spotify refresh token expires and spotify auth endpoint returns a new refresh token
    const newRefreshToken = refresh_token ?? user.spotify_refresh_token;
    // update users table with spotify auth tokens and info
    await pool.query(
      'UPDATE users SET spotify_access_token = $1, spotify_refresh_token = $2, spotify_token_expires_at = $3 WHERE id = $4',
      [access_token, newRefreshToken, setExpireDate, userId]
    );
    return access_token;
  } else {
    // if access token is not expired, return current access token
    return user.spotify_access_token;
  }
}
