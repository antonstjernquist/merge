import { v4 as uuid } from 'uuid';
import type { Agent, AgentRole, AgentInfo } from '@merge/shared-types';
import { config } from '../config.js';

// Lazy import to avoid circular dependency
let roomServiceRef: typeof import('./room.service.js').roomService | null = null;
async function getRoomService() {
  if (!roomServiceRef) {
    const mod = await import('./room.service.js');
    roomServiceRef = mod.roomService;
  }
  return roomServiceRef;
}

class AgentService {
  private agents: Map<string, Agent> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private roomServiceSync: typeof import('./room.service.js').roomService | null = null;

  // Initialize room service reference synchronously after startup
  initRoomService(rs: typeof import('./room.service.js').roomService): void {
    this.roomServiceSync = rs;
  }

  // Resolve room name or ID to UUID
  private resolveRoomId(nameOrId: string): string {
    if (!this.roomServiceSync) return nameOrId;
    const room = this.roomServiceSync.getRoom(nameOrId) || this.roomServiceSync.getRoomByName(nameOrId);
    return room?.id || nameOrId;
  }

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, 60000); // Check every minute
  }

  // Check if an agent ID is currently active
  isAgentActive(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    return agent?.isConnected ?? false;
  }

  connect(
    name: string,
    token: string,
    role: AgentRole = 'worker',
    skills: string[] = [],
    roomId: string | null = null,
    clientAgentId?: string // Client-provided persistent ID
  ): Agent | { error: string } {
    // Use client-provided ID or generate new one
    const id = clientAgentId || uuid();

    // Handle existing session with same ID
    if (clientAgentId) {
      const existing = this.agents.get(clientAgentId);
      if (existing) {
        // Update existing session instead of rejecting
        // This allows the same agent to reconnect/rejoin
        existing.name = name;
        existing.role = role;
        existing.skills = skills;
        existing.currentRoomId = roomId;
        existing.lastSeenAt = new Date().toISOString();
        existing.isConnected = true;
        console.log(`Agent reconnected: ${name} (${clientAgentId}) role=${role} skills=[${skills.join(',')}]`);
        return existing;
      }
    }

    const now = new Date().toISOString();

    const agent: Agent = {
      id,
      name,
      role,
      skills,
      token,
      currentRoomId: roomId,
      connectedAt: now,
      lastSeenAt: now,
      isConnected: true,
    };

    this.agents.set(id, agent);
    console.log(`Agent connected: ${name} (${id}) role=${role} skills=[${skills.join(',')}]`);
    return agent;
  }

  disconnect(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.isConnected = false;
      this.agents.delete(agentId);
      console.log(`Agent disconnected: ${agent.name} (${agentId})`);
      return true;
    }
    return false;
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAgentByName(name: string, roomId: string): Agent | undefined {
    const resolvedRoomId = this.resolveRoomId(roomId);
    for (const agent of this.agents.values()) {
      if (agent.name === name && agent.currentRoomId === resolvedRoomId) {
        return agent;
      }
    }
    return undefined;
  }

  getAgentsBySkill(skill: string, roomId: string): Agent[] {
    const resolvedRoomId = this.resolveRoomId(roomId);
    const result: Agent[] = [];
    for (const agent of this.agents.values()) {
      if (agent.currentRoomId === resolvedRoomId && agent.skills.includes(skill)) {
        result.push(agent);
      }
    }
    return result;
  }

  getRoomWorkers(roomId: string): Agent[] {
    const resolvedRoomId = this.resolveRoomId(roomId);
    const result: Agent[] = [];
    for (const agent of this.agents.values()) {
      if (agent.currentRoomId === resolvedRoomId && (agent.role === 'worker' || agent.role === 'both')) {
        result.push(agent);
      }
    }
    return result;
  }

  getConnectedAgents(): Agent[] {
    return Array.from(this.agents.values()).filter((a) => a.isConnected);
  }

  getAgentInfo(agent: Agent): AgentInfo {
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      skills: agent.skills,
      isConnected: agent.isConnected,
    };
  }

  setAgentRoom(agentId: string, roomId: string | null): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.currentRoomId = roomId;
    }
  }

  updateLastSeen(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastSeenAt = new Date().toISOString();
    }
  }

  private cleanupStaleSessions(): void {
    const now = Date.now();
    for (const [id, agent] of this.agents) {
      const lastSeen = new Date(agent.lastSeenAt).getTime();
      if (now - lastSeen > config.sessionTimeoutMs) {
        console.log(`Session expired for agent: ${agent.name} (${id})`);
        this.agents.delete(id);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const agentService = new AgentService();
