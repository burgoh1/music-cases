import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_ACCESS_SECRET } from '../config.js';

// Login Access Token Verification
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // check if Bearer is included in req.headers
  const checkBearer = req.headers.authorization;
  if (typeof checkBearer === 'undefined' || !checkBearer.startsWith('Bearer')) {
    res.status(401).json({ error: 'bearer not found' });
    return;
  }

  // pull token out of bearer string
  const pullingBearer: string[] = checkBearer.split(' ');
  const pulledToken = pullingBearer[1];

  // verify access token
  try {
    const decoded = jwt.verify(pulledToken ?? '', JWT_ACCESS_SECRET);
    if (typeof decoded === 'string') {
      res.status(401).json({ error: 'invalid token' });
      return;
    }
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
