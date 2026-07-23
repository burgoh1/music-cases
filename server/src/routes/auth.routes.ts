import { Router } from 'express';
import { pool } from '../db.js';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    // TODO(you): check whether a user with this email already exists.
    // Query the `users` table for a matching email. If one exists,
    // respond 409 and return early (don't leak whether it's the email
    // specifically that's taken vs. some other error).

    // TODO(you): hash the plaintext `password` with bcrypt before it ever
    // touches the database. Look at bcrypt's `hash(data, saltRounds)`.
    // We haven't picked a saltRounds value yet -- pick one and be ready
    // to explain the tradeoff in the checkpoint.

    // TODO(you): insert the new user (email, password_hash) into `users`
    // via `pool.query(...)`. Use a parameterized query ($1, $2) -- never
    // string-interpolate user input into SQL.

    // TODO(you): respond 201 with the created user's id and email only.
    // Never send password or password_hash back to the client.

    res.status(501).json({ error: 'not implemented yet' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});
