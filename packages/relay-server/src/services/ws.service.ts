import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type {
  WSMessage,
  JoinRoomPayload,
  LeaveRoomPayload,
  SendMessagePayload,
  SendTaskPayload,
  TaskProgressPayload,
  TaskResultPayload,
} from '@merge/shared-types';
import { config } from '../config.js';
import { roomService } from './room.service.js';
import { taskService } from './task.service.js';
import { agentService } from './agent.service.js';

interface WSClient {
  ws: WebSocket;
  agentId?: string;
  agentName?: string;
  isAlive: boolean;
  rooms: Set<string>; // Room IDs this client has joined
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

      // Get agent name if available
      const agentName = url.searchParams.get('agentName') || undefined;
      const defaultRoom = url.searchParams.get('room') || 'default';

      const client: WSClient = {
        ws,
        agentId: agentId || undefined,
        agentName,
        isAlive: true,
        rooms: new Set(),
      };

      this.clients.add(client);
      console.log(`WebSocket client connected${agentId ? ` (agent: ${agentId})` : ''}`);

      // Auto-join default room if specified
      if (agentId && defaultRoom) {
        this.handleJoinRoom(client, { roomId: defaultRoom });
      }

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
        // Leave all rooms
        if (client.agentId) {
          for (const roomId of client.rooms) {
            this.handleLeaveRoom(client, { roomId }, false);
          }
          roomService.leaveAllRooms(client.agentId);
        }
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

      case 'join_room':
        this.handleJoinRoom(client, message.payload as JoinRoomPayload);
        break;

      case 'leave_room':
        this.handleLeaveRoom(client, message.payload as LeaveRoomPayload);
        break;

      case 'send_message':
        this.handleSendMessage(client, message.payload as SendMessagePayload);
        break;

      case 'send_task':
        this.handleSendTask(client, message.payload as SendTaskPayload);
        break;

      case 'task_progress':
        this.handleTaskProgress(client, message.payload as TaskProgressPayload);
        break;

      case 'task_result':
        this.handleTaskResult(client, message.payload as TaskResultPayload);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleJoinRoom(client: WSClient, payload: JoinRoomPayload): void {
    if (!client.agentId) {
      console.log('Cannot join room: no agentId');
      return;
    }

    const room = roomService.joinRoom(payload.roomId, client.agentId);
    if (!room) {
      console.log(`Failed to join room: ${payload.roomId}`);
      return;
    }

    client.rooms.add(room.id);

    // Get agent info
    const agent = agentService.getAgent(client.agentId);
    const agentInfo = {
      id: client.agentId,
      name: client.agentName || agent?.name || 'Unknown',
    };

    // Notify all room members (including the joining client)
    this.broadcastToRoom(room.id, {
      type: 'room_joined',
      payload: { room, agent: agentInfo },
      timestamp: new Date().toISOString(),
    });
  }

  private handleLeaveRoom(client: WSClient, payload: LeaveRoomPayload, notify = true): void {
    if (!client.agentId) return;

    const left = roomService.leaveRoom(payload.roomId, client.agentId);
    if (!left) return;

    client.rooms.delete(payload.roomId);

    if (notify) {
      // Notify remaining room members
      const agent = agentService.getAgent(client.agentId);
      this.broadcastToRoom(payload.roomId, {
        type: 'room_left',
        payload: {
          roomId: payload.roomId,
          agent: {
            id: client.agentId,
            name: client.agentName || agent?.name || 'Unknown',
          },
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleSendMessage(client: WSClient, payload: SendMessagePayload): void {
    if (!client.agentId) return;

    const message = roomService.addMessage(
      payload.roomId,
      client.agentId,
      payload.content,
      payload.toAgentId
    );

    if (!message) {
      console.log(`Failed to send message to room: ${payload.roomId}`);
      return;
    }

    // If direct message, only send to target agent
    if (payload.toAgentId) {
      this.sendToAgent(payload.toAgentId, {
        type: 'room_message',
        payload: { message },
        timestamp: new Date().toISOString(),
      });
      // Also send back to sender for confirmation
      this.send(client.ws, {
        type: 'room_message',
        payload: { message },
        timestamp: new Date().toISOString(),
      });
    } else {
      // Broadcast to all room members
      this.broadcastToRoom(payload.roomId, {
        type: 'room_message',
        payload: { message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleSendTask(client: WSClient, payload: SendTaskPayload): void {
    if (!client.agentId) return;

    const task = taskService.createTask(client.agentId, payload.roomId, {
      title: payload.title,
      description: payload.description,
      blocking: payload.blocking,
      toAgentId: payload.toAgentId,
      target: payload.target,
    });
  }

  private handleTaskProgress(client: WSClient, payload: TaskProgressPayload): void {
    if (!client.agentId) return;

    const task = taskService.getTask(payload.taskId);
    if (!task) return;

    // Send progress to the task creator
    this.sendToAgent(task.fromAgentId, {
      type: 'task_progress',
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  private handleTaskResult(client: WSClient, payload: TaskResultPayload): void {
    if (!client.agentId) return;

    const updatedTask = taskService.submitResult(
      payload.taskId,
      client.agentId,
      {
        success: payload.success,
        output: payload.output,
        error: payload.error,
      }
    );

    if (updatedTask) {
      // The task_completed event is already broadcast by taskService
      console.log(`Task result submitted: ${payload.taskId}`);
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

  broadcastToRoom(roomId: string, message: WSMessage, excludeAgentId?: string): void {
    const agentIds = roomService.getRoomAgentIds(roomId);

    this.clients.forEach((client) => {
      if (client.agentId && agentIds.includes(client.agentId)) {
        if (excludeAgentId && client.agentId === excludeAgentId) {
          return;
        }
        this.send(client.ws, message);
      }
    });
  }

  broadcastToAgentsWithSkill(roomId: string, skill: string, message: WSMessage, excludeAgentId?: string): void {
    const agents = agentService.getAgentsBySkill(skill, roomId);

    this.clients.forEach((client) => {
      if (client.agentId && agents.some((a) => a.id === client.agentId)) {
        if (excludeAgentId && client.agentId === excludeAgentId) {
          return;
        }
        this.send(client.ws, message);
      }
    });
  }

  broadcastToRoomWorkers(roomId: string, message: WSMessage, excludeAgentId?: string): void {
    const workers = agentService.getRoomWorkers(roomId);

    this.clients.forEach((client) => {
      if (client.agentId && workers.some((a) => a.id === client.agentId)) {
        if (excludeAgentId && client.agentId === excludeAgentId) {
          return;
        }
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
