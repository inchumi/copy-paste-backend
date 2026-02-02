import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface DevicePair {
  deviceId: string;
  token: string;
  createdAt: Date;
}

class PairingService {
  private pairs: Map<string, DevicePair> = new Map();

  createPair(deviceId: string): { token: string } {
    const token = jwt.sign({ deviceId }, JWT_SECRET, { expiresIn: '365d' });
    
    this.pairs.set(deviceId, {
      deviceId,
      token,
      createdAt: new Date()
    });

    return { token };
  }

  verifyToken(token: string): { deviceId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { deviceId: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  getPair(deviceId: string): DevicePair | undefined {
    return this.pairs.get(deviceId);
  }

  removePair(deviceId: string): boolean {
    return this.pairs.delete(deviceId);
  }
}

export const pairingService = new PairingService();