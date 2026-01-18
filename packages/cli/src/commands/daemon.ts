import { Command } from 'commander';
import { spawn } from 'child_process';
import { WebSocketClient } from '../lib/websocket.js';
import { loadConfig, isConnected } from '../lib/config.js';
import { acceptTask } from '../lib/client.js';
import type {
  WSMessage,
  RoomTaskPayload,
  Task,
} from '@merge/shared-types';

// Check if claude CLI is available
async function hasClaudeCLI(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('claude', ['--version'], { stdio: 'ignore' });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

// Run claude CLI with a prompt
function runClaude(prompt: string, cwd: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn('claude', ['-p', prompt, '--no-input'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      resolve({ success: false, output: `Failed to run claude: ${err.message}` });
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() });
      } else {
        resolve({ success: false, output: stderr || stdout || `Exit code: ${code}` });
      }
    });
  });
}

interface DaemonOptions {
  room?: string;
  cwd?: string;
  autoAccept?: boolean;
  verbose?: boolean;
}

class AgentDaemon {
  private client: WebSocketClient;
  private options: DaemonOptions;
  private activeTasks: Map<string, Task> = new Map();
  private hasClaudeCliAvailable = false;
  private cwd: string;

  constructor(options: DaemonOptions) {
    this.options = options;
    this.cwd = options.cwd || process.cwd();

    this.client = new WebSocketClient({
      room: options.room,
      reconnect: true,
      onMessage: (msg) => this.handleMessage(msg),
      onConnect: () => this.log('Connected to relay server'),
      onDisconnect: () => this.log('Disconnected from relay server'),
      onError: (err) => this.log(`Error: ${err.message}`),
    });
  }

  private log(message: string): void {
    if (this.options.verbose) {
      const time = new Date().toLocaleTimeString();
      console.log(`[${time}] ${message}`);
    }
  }

  async start(): Promise<void> {
    // Check if claude CLI is available
    this.hasClaudeCliAvailable = await hasClaudeCLI();
    if (!this.hasClaudeCliAvailable) {
      console.log('Note: Claude CLI not found. Tasks will be accepted but not auto-executed.');
      console.log('Install Claude Code from: https://claude.ai/download');
    } else {
      console.log('Claude CLI available - tasks will be auto-executed.');
    }

    await this.client.connect();

    console.log(`Agent daemon started in "${this.options.room || 'default'}" room`);
    console.log(`Working directory: ${this.cwd}`);
    console.log('Waiting for tasks...\n');
  }

  stop(): void {
    this.client.close();
  }

  private handleMessage(message: WSMessage): void {
    switch (message.type) {
      case 'room_task':
        this.handleNewTask(message.payload as RoomTaskPayload);
        break;
      case 'task_created': {
        // Handle tasks created via HTTP API
        const payload = message.payload as { task: Task };
        this.handleNewTask({ task: payload.task, roomId: 'default' });
        break;
      }
    }
  }

  private async handleNewTask(payload: RoomTaskPayload): Promise<void> {
    const { task, roomId } = payload;
    const config = loadConfig();

    // Skip if task is targeted to another agent
    if (task.toAgentId && task.toAgentId !== config.agentId) {
      this.log(`Skipping task "${task.title}" - assigned to another agent`);
      return;
    }

    // Skip if we created this task
    if (task.fromAgentId === config.agentId) {
      return;
    }

    this.log(`Received task: "${task.title}" (${task.id})`);

    if (this.options.autoAccept) {
      this.activeTasks.set(task.id, task);
      await this.executeTask(task, roomId);
    } else {
      console.log(`\nNew task available: "${task.title}"`);
      console.log(`  ID: ${task.id}`);
      console.log(`  Description: ${task.description}`);
      console.log(`  Blocking: ${task.blocking}`);
      console.log(`  Use "merge accept ${task.id}" to accept this task\n`);
    }
  }

  private async executeTask(task: Task, _roomId: string): Promise<void> {
    console.log(`\nExecuting task: "${task.title}"`);
    console.log(`Description: ${task.description}`);

    // Accept the task first via HTTP API
    try {
      await acceptTask(task.id);
      console.log('Task accepted');
    } catch (err) {
      console.error(`Failed to accept task: ${err instanceof Error ? err.message : err}`);
      return;
    }

    if (!this.hasClaudeCliAvailable) {
      // No Claude CLI - send a placeholder result
      console.log('(Claude CLI not available - sending placeholder result)');

      this.client.sendTaskResult(
        task.id,
        true,
        'Task accepted but Claude CLI not available. Install from https://claude.ai/download'
      );
      this.activeTasks.delete(task.id);
      return;
    }

    try {
      // Use Claude CLI to execute the task
      const prompt = `${task.title}\n\n${task.description}`;
      console.log('Running claude CLI...');

      const result = await runClaude(prompt, this.cwd);

      if (result.success) {
        console.log('Task completed successfully');
        this.client.sendTaskResult(task.id, true, result.output);
      } else {
        console.error(`Task failed: ${result.output}`);
        this.client.sendTaskResult(task.id, false, undefined, result.output);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Task failed: ${errorMessage}`);
      this.client.sendTaskResult(task.id, false, undefined, errorMessage);
    } finally {
      this.activeTasks.delete(task.id);
    }
  }
}

export const daemonCommand = new Command('daemon')
  .description('Run as a daemon that listens for and executes tasks using Claude Code SDK')
  .option('--room <room>', 'Room to join (uses default from config if not specified)')
  .option('--cwd <directory>', 'Working directory for task execution (default: current directory)')
  .option('--auto-accept', 'Automatically accept and execute incoming tasks')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    if (!isConnected()) {
      console.error(JSON.stringify({
        success: false,
        error: 'Not connected. Run "agent-merge connect" first.',
      }));
      process.exit(1);
    }

    const config = loadConfig();

    const daemon = new AgentDaemon({
      room: options.room || config.defaultRoom,
      cwd: options.cwd,
      autoAccept: options.autoAccept,
      verbose: options.verbose,
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down daemon...');
      daemon.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      daemon.stop();
      process.exit(0);
    });

    try {
      await daemon.start();
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Daemon failed to start',
      }));
      process.exit(1);
    }
  });
