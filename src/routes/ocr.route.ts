import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { ocrService } from '../services/ocr.service';
import { WebSocketGateway } from '../websocket/ws.gateway';

const router = Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

router.post('/ocr', authMiddleware, upload.single('image'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  // deviceId del token = desktop emparejado (el móvil sube con el token del desktop)
  const deviceId = req.deviceId!;
  const imagePath = req.file.path;

  // Procesar OCR y enviar el texto al desktop emparejado por WebSocket
  ocrService.extractText(imagePath)
    .then(text => {
      const wsGateway = req.app.get('wsGateway') as WebSocketGateway;
      wsGateway.sendToDevice(deviceId, {
        type: 'ocr_result',
        text,
        timestamp: new Date().toISOString()
      });
    })
    .catch(error => {
      console.error('OCR failed:', error);
      const wsGateway = req.app.get('wsGateway') as WebSocketGateway;
      wsGateway.sendToDevice(deviceId, {
        type: 'ocr_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

  res.json({
    success: true,
    message: 'Image received, processing OCR'
  });
});

export default router;