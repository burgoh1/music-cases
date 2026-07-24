import { Router } from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
} from '../config.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const emailCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (emailCheck.rows.length > 0) {
      res.status(409).json({ error: 'The email you put is already registered' });
      return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    res
      .status(201)
      .json({ message: 'User registered successfully', user: newUser.rows[0] });
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      err.code === '23505'
    ) {
      res.status(409).json({ error: 'The email you put is already registered' });
      return;
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ error: 'invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'invalid email or password' });
      return;
    }

    const accessToken = jwt.sign({ userId: user.id }, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    });
    res.status(200).json({ accessToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  // TODO(you): requireAuth only calls next() if the access token was valid,
  // so by the time this handler runs, req.userId is guaranteed to be set.
  // Query the `users` table for that id and respond 200 with { id, email }.
  // Same rule as always: never include password_hash in the response.
  // If somehow no user matches (e.g. the account was deleted after the
  // token was issued), respond 404.
});
