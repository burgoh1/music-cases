import { Router } from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
} from '../config.js';

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

    // TODO(you): if no user was found, respond 401 with a generic message
    // like "invalid email or password" -- NOT "email not found". Think back
    // to the signup lesson: we were fine revealing "email already
    // registered" there. Why is revealing the equivalent ("no account with
    // that email") a bad idea here, specifically on the LOGIN endpoint?
    // (hint: what could an attacker automate, one email at a time, if this
    // response looked different depending on whether the email existed?)

    // TODO(you): use bcrypt.compare(password, user.password_hash) to check
    // the submitted password against the stored hash. If it doesn't match,
    // respond with the exact same 401 message you used above -- an attacker
    // should not be able to tell "wrong email" apart from "right email,
    // wrong password" by reading your response.

    // TODO(you): sign an access token with jwt.sign(payload, secret, options).
    //   payload: at least { userId: user.id }
    //   secret: JWT_ACCESS_SECRET
    //   options: { expiresIn: ACCESS_TOKEN_EXPIRY }
    // Docs: https://github.com/auth0/node-jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback

    // TODO(you): sign a refresh token the same way, but with
    // JWT_REFRESH_SECRET and REFRESH_TOKEN_EXPIRY instead.

    // TODO(you): respond 200 with both tokens in the JSON body, e.g.
    // { accessToken, refreshToken }.
    // NOTE: putting the refresh token in the response body is a TEMPORARY
    // stand-in so you can see the full login flow work end-to-end. It does
    // not belong here long-term -- next lesson replaces this with a proper
    // httpOnly cookie. Don't build any client code that depends on reading
    // refreshToken from this response; it's going away.
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});
