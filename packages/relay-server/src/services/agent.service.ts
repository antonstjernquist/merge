import { v4 as uuid } from 'uuid';
import type { Agent, AgentRole, AgentInfo } from '@merge/shared-types';
import { config } from '../config.js';

class AgentService {
  private agents: Map<string, Agent> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, 60000); // Check every minute
  }

  connect(
    name: string,
    token: string,
    role: AgentRole = 'worker',
    skills: string[] = [],
    roomId: string | null = null
  ): Agent {
    const id = uuid();
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
    for (const agent of this.agents.values()) {
      if (agent.name === name && agent.currentRoomId === roomId) {
        return agent;
      }
    }
    return undefined;
  }

  getAgentsBySkill(skill: string, roomId: string): Agent[] {
    const result: Agent[] = [];
    for (const agent of this.agents.values()) {
      if (agent.currentRoomId === roomId && agent.skills.includes(skill)) {
        result.push(agent);
      }
    }
    return result;
  }

  getRoomWorkers(roomId: string): Agent[] {
    const result: Agent[] = [];
    for (const agent of this.agents.values()) {
      if (agent.currentRoomId === roomId && (agent.role === 'worker' || agent.role === 'both')) {
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
