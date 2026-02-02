import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketGateway } from './websocket/ws.gateway';
import pairRouter from './routes/pair.route';
import ocrRouter from './routes/ocr.route';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Initialize WebSocket Gateway
const wsGateway = new WebSocketGateway(server);

// Make wsGateway available to routes
app.set('wsGateway', wsGateway);

// Routes
app.use('/api', pairRouter);
app.use('/api', ocrRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});