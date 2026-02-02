import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { pairingService } from '../services/pairing.service';

interface AuthenticatedWebSocket extends WebSocket {
  deviceId?: string;
  role?: 'desktop' | 'mobile';
  isAlive?: boolean;
}

export class WebSocketGateway {
  private wss: WebSocketServer;
  /** Solo los clientes con role 'desktop' — aquí se envían los ocr_result */
  private desktopClients: Map<string, AuthenticatedWebSocket> = new Map();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server });
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      console.log('WebSocket connection attempt');

      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'authenticate') {
            this.handleAuthentication(ws, data.token, data.role);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        if (ws.deviceId && ws.role === 'desktop') {
          this.desktopClients.delete(ws.deviceId);
          console.log(`Desktop disconnected: ${ws.deviceId}`);
        }
      });
    });

    // Heartbeat
    setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          if (ws.deviceId && ws.role === 'desktop') {
            this.desktopClients.delete(ws.deviceId);
          }
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  private handleAuthentication(ws: AuthenticatedWebSocket, token: string, role?: string) {
    const decoded = pairingService.verifyToken(token);

    if (!decoded) {
      ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
      ws.close();
      return;
    }

    ws.deviceId = decoded.deviceId;
    const clientRole = role === 'mobile' ? 'mobile' : 'desktop';
    ws.role = clientRole;

    // Solo guardamos en desktopClients al desktop; ocr_result se envía solo a este mapa
    if (clientRole === 'desktop') {
      this.desktopClients.set(decoded.deviceId, ws);
      console.log(`Desktop authenticated: ${decoded.deviceId}`);
    } else {
      console.log(`Mobile authenticated (pair): ${decoded.deviceId}`);
    }

    ws.send(JSON.stringify({ type: 'authenticated', deviceId: decoded.deviceId }));
  }

  /** Envía datos al desktop emparejado con este deviceId (no al móvil). */
  sendToDevice(deviceId: string, data: any) {
    const client = this.desktopClients.get(deviceId);

    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
      console.log(`Sent to desktop ${deviceId}:`, data.type);
    } else {
      console.warn(`Desktop ${deviceId} not connected. Connected desktops: ${Array.from(this.desktopClients.keys()).join(', ') || 'none'}`);
    }
  }
}