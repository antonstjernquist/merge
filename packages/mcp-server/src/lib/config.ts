import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { parse, stringify } from 'yaml';
import type { AgentRole } from '@merge/shared-types';

export interface MCPConfig {
  agentId: string;
  serverUrl: string;
  session?: {
    roomName: string;
    agentName: string;
    role: AgentRole;
    skills: string[];
    roomKey?: string;
  };
}

const CONFIG_DIR = join(homedir(), '.merge');
const CONFIG_FILE = join(CONFIG_DIR, 'mcp-config.yaml');

const DEFAULT_SERVER_URL = 'https://relay.kresis.ai';

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): MCPConfig {
  ensureConfigDir();

  let config: Partial<MCPConfig> = {};

  if (existsSync(CONFIG_FILE)) {
    try {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      config = parse(content) as Partial<MCPConfig>;
    } catch {
      config = {};
    }
  }

  if (!config.agentId) {
    config.agentId = randomUUID();
    saveConfig(config as MCPConfig);
  }

  return {
    agentId: config.agentId,
    serverUrl: config.serverUrl || process.env.MERGE_SERVER_URL || DEFAULT_SERVER_URL,
    session: config.session,
  };
}

export function saveConfig(config: MCPConfig): void {
  ensureConfigDir();
  const content = stringify(config);
  writeFileSync(CONFIG_FILE, content, 'utf-8');
}

export function saveSession(session: MCPConfig['session']): void {
  const config = loadConfig();
  config.session = session;
  saveConfig(config);
}

export function clearSession(): void {
  const config = loadConfig();
  delete config.session;
  saveConfig(config);
}
