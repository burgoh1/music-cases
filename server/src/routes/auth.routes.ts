import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.middleware.js';

import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
} from '../config.js';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email ||
    !password
  ) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    // check whether a user with this email already exists.
    const emailCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (emailCheck.rows.length > 0) {
      res
        .status(409)
        .json({ error: 'The email you put is already registered' });
      return;
    }

    // hash the plaintext `password` before it touches the database.
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // insert the new user into users database
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    // if everything works, return user's id and email.
    res
      .status(201)
      .json({ message: 'User registered successfully', user: newUser.rows[0] });
  } catch (err) {
    // race-condition error handler
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      err.code === '23505'
    ) {
      res
        .status(409)
        .json({ error: 'The email you put is already registered' });
      return;
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email ||
    !password
  ) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    const user = result.rows[0];

    // check to see if user exists in the database
    if (!user) {
      res.status(401).json({ error: 'invalid email or password' });
      return;
    }

    // check the submitted password against the stored hash.
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'invalid email or password' });
      return;
    }

    // sign an access token
    const accessToken = jwt.sign({ userId: user.id }, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // sign a refresh token, tracked in refresh_tokens via a unique jti so
    // it can be individually revoked/rotated later
    const jti = randomUUID();
    await pool.query(
      'INSERT INTO refresh_tokens (jti, user_id) VALUES ($1, $2)',
      [jti, user.id]
    );
    const refreshToken = jwt.sign(
      { userId: user.id, jti },
      JWT_REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
      }
    );

    // set refresh token in HTTP header
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    });
    // if everything works, respond with access token
    res.status(200).json({ accessToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  // check if user exists in the database
  const idCheck = await pool.query(
    'SELECT id, email FROM users WHERE id = $1',
    [req.userId]
  );
  const user = idCheck.rows[0];
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  res.status(200).json({ user });
});

authRouter.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    res.status(401).json({ error: 'missing refreshToken' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken ?? '', JWT_REFRESH_SECRET);
    if (typeof decoded === 'string') {
      res.status(401).json({ error: 'invalid token' });
      return;
    }

    // TODO(you): look up decoded.jti in refresh_tokens
    // (SELECT * FROM refresh_tokens WHERE jti = $1).
    //
    // Two "something's wrong" cases to handle BEFORE issuing anything:
    //   1. No row matches at all -- this jti was never issued (or the
    //      table was wiped). Respond 401.
    //   2. A row matches but its `revoked` column is already true -- this
    //      exact refresh token was already used once before. This is
    //      REUSE, the scenario this lesson exists for. Don't just reject
    //      it: revoke every row for this user
    //      (UPDATE refresh_tokens SET revoked = true WHERE user_id = $1),
    //      call res.clearCookie('refreshToken') so this browser's stale
    //      cookie is gone too, and respond 401. The user now has to log
    //      in again for real, on every device.
    //
    // If neither of those apply (a real, first-use row), do the rotation:
    //   1. Mark THIS row revoked = true (single-use -- it cannot be
    //      presented again after this point).
    //   2. Generate a new jti (randomUUID(), already imported above) and
    //      INSERT a new refresh_tokens row for the same user_id.
    //   3. jwt.sign a NEW refresh token with { userId, jti: <the new one> },
    //      JWT_REFRESH_SECRET, REFRESH_TOKEN_EXPIRY -- and res.cookie(...)
    //      it, replacing the old one (same options as /login's cookie).
    //   4. jwt.sign a new access token same as before, respond 200 with it.

    // sign an access token
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      JWT_ACCESS_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      }
    );
    res.status(200).json({ accessToken });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: err.message });
      return;
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: err.message });
      return;
    } else {
      const error = err instanceof Error ? err.message : String(err);
      res.status(401).json({ error: error });
      return;
    }
  }
});
