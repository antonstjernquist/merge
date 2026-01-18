import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';
import type { Room, RoomMessage } from '@merge/shared-types';

const MAX_MESSAGES_PER_ROOM = 100;

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

class RoomService {
  private rooms: Map<string, Room> = new Map();
  private messages: Map<string, RoomMessage[]> = new Map(); // roomId -> messages

  constructor() {
    // Create default room
    this.createRoom('default');
  }

  createRoom(name: string, createdBy: string | null = null): Room {
    // Check if room with this name already exists
    const existing = this.getRoomByName(name);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const room: Room = {
      id: uuid(),
      name,
      createdAt: now,
      agentIds: [],
      apiKeyHash: null,
      isLocked: false,
      createdBy,
    };

    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
    console.log(`Room created: ${name} (${room.id})`);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByName(name: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.name === name) {
        return room;
      }
    }
    return undefined;
  }

  getOrCreateRoom(nameOrId: string): Room {
    // Try by ID first
    let room = this.rooms.get(nameOrId);
    if (room) return room;

    // Try by name
    room = this.getRoomByName(nameOrId);
    if (room) return room;

    // Create new room
    return this.createRoom(nameOrId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  joinRoom(roomId: string, agentId: string): Room | null {
    const room = this.getOrCreateRoom(roomId);
    if (!room) return null;

    if (!room.agentIds.includes(agentId)) {
      room.agentIds.push(agentId);
      console.log(`Agent ${agentId} joined room: ${room.name}`);
    }

    return room;
  }

  leaveRoom(roomId: string, agentId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const index = room.agentIds.indexOf(agentId);
    if (index > -1) {
      room.agentIds.splice(index, 1);
      console.log(`Agent ${agentId} left room: ${room.name}`);
      return true;
    }

    return false;
  }

  leaveAllRooms(agentId: string): void {
    for (const room of this.rooms.values()) {
      const index = room.agentIds.indexOf(agentId);
      if (index > -1) {
        room.agentIds.splice(index, 1);
      }
    }
  }

  getAgentRooms(agentId: string): Room[] {
    return Array.from(this.rooms.values()).filter((room) =>
      room.agentIds.includes(agentId)
    );
  }

  addMessage(roomId: string, fromAgentId: string, content: string, toAgentId?: string): RoomMessage | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const message: RoomMessage = {
      id: uuid(),
      roomId,
      fromAgentId,
      toAgentId: toAgentId || null,
      content,
      timestamp: new Date().toISOString(),
    };

    const roomMessages = this.messages.get(roomId) || [];
    roomMessages.push(message);

    // Keep only last N messages
    if (roomMessages.length > MAX_MESSAGES_PER_ROOM) {
      roomMessages.shift();
    }

    this.messages.set(roomId, roomMessages);
    return message;
  }

  getRoomMessages(roomId: string, limit: number = 50): RoomMessage[] {
    const messages = this.messages.get(roomId) || [];
    return messages.slice(-limit);
  }

  getRoomAgentIds(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? [...room.agentIds] : [];
  }

  lockRoom(roomId: string, apiKey: string, agentId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.isLocked) {
      return false;
    }

    room.apiKeyHash = hashKey(apiKey);
    room.isLocked = true;
    room.createdBy = agentId;
    console.log(`Room locked: ${room.name} by agent ${agentId}`);
    return true;
  }

  validateRoomKey(roomId: string, key: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (!room.isLocked || !room.apiKeyHash) {
      return true;
    }

    return room.apiKeyHash === hashKey(key);
  }

  isRoomLocked(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.isLocked : false;
  }
}

export const roomService = new RoomService();
