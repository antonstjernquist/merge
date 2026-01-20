import { loadConfig } from './config.js';

export interface SessionState {
  agentId: string;
  token: string | null;
  roomId: string | null;
  roomName: string | null;
  agentName: string | null;
  serverUrl: string;
  lastMessageTimestamp: string | null;
}

let state: SessionState | null = null;

export function getState(): SessionState {
  if (!state) {
    const config = loadConfig();
    state = {
      agentId: config.agentId,
      token: null,
      roomId: null,
      roomName: null,
      agentName: null,
      serverUrl: config.serverUrl,
      lastMessageTimestamp: null,
    };
  }
  return state;
}

export function updateState(updates: Partial<SessionState>): SessionState {
  const current = getState();
  state = { ...current, ...updates };
  return state;
}

export function clearSession(): void {
  const config = loadConfig();
  state = {
    agentId: config.agentId,
    token: null,
    roomId: null,
    roomName: null,
    agentName: null,
    serverUrl: config.serverUrl,
    lastMessageTimestamp: null,
  };
}

export function isConnected(): boolean {
  const s = getState();
  return s.token !== null && s.roomId !== null;
}
