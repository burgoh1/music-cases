import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_REFRESH_SECRET } from '../config.js';

export function refreshCookie(req: Request, res: Response, next: NextFunction) {
  // get refresh token from cookies when spotify redirects
  const checkRefreshToken = req.cookies.refreshToken;
  if (!checkRefreshToken) {
    res.status(401).json({ error: 'missing refresh token' });
    return;
  }
  try {
    // veryfy spotify redirect refresh token with jwt refresh secret
    const decoded = jwt.verify(checkRefreshToken ?? '', JWT_REFRESH_SECRET);
    if (typeof decoded === 'string') {
      res.status(401).json({ error: 'invalid token' });
      return;
    }
    // set req userId header to decoded userId for spotifyRouter to handle
    req.userId = decoded.userId;
    next();
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
}
