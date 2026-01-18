import WebSocket from 'ws';
import type { WSMessage, WSMessageType } from '@merge/shared-types';
import { loadConfig } from './config.js';

export type MessageHandler = (message: WSMessage) => void;

interface WebSocketClientOptions {
  room?: string;
  onMessage?: MessageHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private options: WebSocketClientOptions;
  private messageHandlers: Map<WSMessageType, MessageHandler[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isClosing = false;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(options: WebSocketClientOptions = {}) {
    this.options = {
      reconnect: true,
      reconnectInterval: 5000,
      ...options,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = loadConfig();

      if (!config.token || !config.agentId) {
        reject(new Error('Not connected. Run "agent-merge connect" first.'));
        return;
      }

      const params = new URLSearchParams({
        token: config.token,
        agentId: config.agentId,
      });

      if (config.agentName) {
        params.set('agentName', config.agentName);
      }

      if (this.options.room || config.defaultRoom) {
        params.set('room', this.options.room || config.defaultRoom || 'default');
      }

      const wsUrl = `${config.wsUrl}/ws?${params.toString()}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('WebSocket connected');
        this.startPing();
        this.options.onConnect?.();
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          this.handleMessage(message);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      });

      this.ws.on('close', () => {
        this.stopPing();
        console.log('WebSocket disconnected');
        this.options.onDisconnect?.();

        if (this.options.reconnect && !this.isClosing) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        this.options.onError?.(err);
        reject(err);
      });
    });
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({
        type: 'ping',
        payload: {},
        timestamp: new Date().toISOString(),
      });
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    console.log(`Reconnecting in ${this.options.reconnectInterval}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((err) => {
        console.error('Reconnection failed:', err);
      });
    }, this.options.reconnectInterval);
  }

  private handleMessage(message: WSMessage): void {
    // Call generic handler
    this.options.onMessage?.(message);

    // Call type-specific handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }
  }

  on(type: WSMessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  off(type: WSMessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  joinRoom(roomId: string): void {
    this.send({
      type: 'join_room',
      payload: { roomId },
      timestamp: new Date().toISOString(),
    });
  }

  leaveRoom(roomId: string): void {
    this.send({
      type: 'leave_room',
      payload: { roomId },
      timestamp: new Date().toISOString(),
    });
  }

  sendMessage(roomId: string, content: string, toAgentId?: string): void {
    this.send({
      type: 'send_message',
      payload: { roomId, content, toAgentId },
      timestamp: new Date().toISOString(),
    });
  }

  sendTask(
    roomId: string,
    title: string,
    description: string,
    options?: { blocking?: boolean; toAgentId?: string }
  ): void {
    this.send({
      type: 'send_task',
      payload: {
        roomId,
        title,
        description,
        blocking: options?.blocking,
        toAgentId: options?.toAgentId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  sendTaskProgress(taskId: string, content: string): void {
    this.send({
      type: 'task_progress',
      payload: { taskId, content },
      timestamp: new Date().toISOString(),
    });
  }

  sendTaskResult(
    taskId: string,
    success: boolean,
    output?: string,
    error?: string
  ): void {
    this.send({
      type: 'task_result',
      payload: { taskId, success, output, error },
      timestamp: new Date().toISOString(),
    });
  }

  close(): void {
    this.isClosing = true;
    this.stopPing();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton for simple use cases
let defaultClient: WebSocketClient | null = null;

export function getWebSocketClient(options?: WebSocketClientOptions): WebSocketClient {
  if (!defaultClient) {
    defaultClient = new WebSocketClient(options);
  }
  return defaultClient;
}

export function closeWebSocketClient(): void {
  if (defaultClient) {
    defaultClient.close();
    defaultClient = null;
  }
}
