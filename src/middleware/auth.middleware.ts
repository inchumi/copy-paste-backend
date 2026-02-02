import { Request, Response, NextFunction } from 'express';
import { pairingService } from '../services/pairing.service';

export interface AuthRequest extends Request {
  deviceId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const decoded = pairingService.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.deviceId = decoded.deviceId;
  next();
}