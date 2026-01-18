import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { WSMessage } from '@merge/shared-types';
import { config } from '../config.js';

interface WSClient {
  ws: WebSocket;
  agentId?: string;
  isAlive: boolean;
}

class WSService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WSClient> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      // Validate token from query string
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const agentId = url.searchParams.get('agentId');

      if (token !== config.sharedToken) {
        ws.close(1008, 'Invalid token');
        return;
      }

      const client: WSClient = {
        ws,
        agentId: agentId || undefined,
        isAlive: true,
      };

      this.clients.add(client);
      console.log(`WebSocket client connected${agentId ? ` (agent: ${agentId})` : ''}`);

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          this.handleMessage(client, message);
        } catch (err) {
          console.error('Invalid WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
        console.log(`WebSocket client disconnected${agentId ? ` (agent: ${agentId})` : ''}`);
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        this.clients.delete(client);
      });
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(client);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000);

    console.log('WebSocket server initialized');
  }

  private handleMessage(client: WSClient, message: WSMessage): void {
    switch (message.type) {
      case 'ping':
        this.send(client.ws, {
          type: 'pong',
          payload: {},
          timestamp: new Date().toISOString(),
        });
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: WSMessage, excludeAgentId?: string): void {
    this.clients.forEach((client) => {
      if (excludeAgentId && client.agentId === excludeAgentId) {
        return;
      }
      this.send(client.ws, message);
    });
  }

  sendToAgent(agentId: string, message: WSMessage): void {
    this.clients.forEach((client) => {
      if (client.agentId === agentId) {
        this.send(client.ws, message);
      }
    });
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.forEach((client) => {
      client.ws.terminate();
    });
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const wsService = new WSService();
