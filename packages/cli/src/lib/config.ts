import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { parse, stringify } from 'yaml';
import type { CLIConfig } from '@merge/shared-types';

const CONFIG_DIR = join(homedir(), '.merge');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');

const DEFAULT_CONFIG: CLIConfig = {
  serverUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:3000',
};

// Generate a persistent agent ID for this machine
function generateAgentId(): string {
  return randomUUID();
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): CLIConfig {
  ensureConfigDir();

  let config: CLIConfig;

  if (!existsSync(CONFIG_FILE)) {
    config = { ...DEFAULT_CONFIG };
  } else {
    try {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = parse(content) as Partial<CLIConfig>;
      config = { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      config = { ...DEFAULT_CONFIG };
    }
  }

  // Ensure persistent agent ID exists
  if (!config.agentId) {
    config.agentId = generateAgentId();
    saveConfig(config);
  }

  return config;
}

export function saveConfig(config: CLIConfig): void {
  ensureConfigDir();
  const content = stringify(config);
  writeFileSync(CONFIG_FILE, content, 'utf-8');
}

export function updateConfig(updates: Partial<CLIConfig>): CLIConfig {
  const config = loadConfig();
  const updated = { ...config, ...updates };
  saveConfig(updated);
  return updated;
}

export function clearSession(): void {
  const config = loadConfig();
  delete config.token;
  // Keep agentId - it's persistent for this machine
  delete config.agentName;
  saveConfig(config);
}

export function isConnected(): boolean {
  const config = loadConfig();
  // Agent ID is always present (generated on first load)
  // Connected means we have a valid token from the server
  return !!config.token;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
