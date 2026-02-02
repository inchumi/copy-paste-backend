import { Router } from 'express';
import { pairingService } from '../services/pairing.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.post('/pair', (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const existingPair = pairingService.getPair(deviceId);
  if (existingPair) {
    return res.json({
      success: true,
      token: existingPair.token,
      deviceId
    });
  }

  const { token } = pairingService.createPair(deviceId);

  res.json({
    success: true,
    token,
    deviceId
  });
});

// Unpair endpoint (usado por mobile y desktop)
router.post('/unpair', authMiddleware, (req: AuthRequest, res) => {
  const deviceId = req.deviceId!;
  
  pairingService.removePair(deviceId);
  
  // Notify via WebSocket
  const wsGateway = req.app.get('wsGateway');
  if (wsGateway) {
    wsGateway.sendToDevice(deviceId, {
      type: 'unpaired',
      message: 'Device has been unpaired',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    message: 'Device unpaired successfully'
  });
});

export default router;