import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { parse, stringify } from 'yaml';
import type { CLIConfig } from '@merge/shared-types';

const CONFIG_DIR = join(homedir(), '.merge');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');

const DEFAULT_CONFIG: CLIConfig = {
  serverUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:3000',
};

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): CLIConfig {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = parse(content) as Partial<CLIConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
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
  delete config.agentId;
  delete config.agentName;
  saveConfig(config);
}

export function isConnected(): boolean {
  const config = loadConfig();
  return !!(config.token && config.agentId);
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
