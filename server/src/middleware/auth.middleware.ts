import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_ACCESS_SECRET } from '../config.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // TODO(you): read the `Authorization` header off `req.headers`. Standard
  // convention is `Authorization: Bearer <token>` -- the header value is a
  // literal string starting with "Bearer " followed by the JWT. If the
  // header is missing, or doesn't start with "Bearer ", respond 401 and
  // return -- don't call next().

  // TODO(you): pull just the token part out of that header (everything
  // after "Bearer ").

  // TODO(you): verify the token with jwt.verify(token, JWT_ACCESS_SECRET).
  // This call THROWS if the token is invalid, tampered with, or expired --
  // wrap it in a try/catch. On failure (the catch block), respond 401 and
  // return. On success, jwt.verify returns the decoded payload you signed
  // back in Lesson 2 (the object with `userId` in it).
  // Docs: https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback

  // TODO(you): attach the decoded userId onto `req.userId` (this property
  // already exists on Express's Request type -- see
  // src/types/express.d.ts, which we added so TypeScript knows about it),
  // then call `next()` to let the request continue to the actual route
  // handler.
}
