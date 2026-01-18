import { Command } from 'commander';
import { WebSocketClient } from '../lib/websocket.js';
import { loadConfig, isConnected } from '../lib/config.js';
import { acceptTask } from '../lib/client.js';
import type {
  WSMessage,
  RoomTaskPayload,
  Task,
} from '@merge/shared-types';

// Claude Code SDK type (when available)
type ClaudeFunction = (
  prompt: string,
  options?: { cwd?: string }
) => AsyncIterable<{ type: string; content?: string; result?: unknown }>;

// Dynamic import for Claude Code SDK (may not be installed)
async function getClaudeCode(): Promise<ClaudeFunction | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = await import('@anthropic-ai/claude-code' as string);
    return module.claude as ClaudeFunction;
  } catch {
    return null;
  }
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
  private claudeCode: ClaudeFunction | null = null;
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
    // Try to load Claude Code SDK
    this.claudeCode = await getClaudeCode();
    if (!this.claudeCode) {
      console.log('Note: Claude Code SDK not found. Tasks will be logged but not executed.');
      console.log('Install with: npm install -g @anthropic-ai/claude-code');
    } else {
      console.log('Claude Code SDK loaded successfully.');
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

    if (!this.claudeCode) {
      // No Claude Code SDK - just log and send a placeholder result
      console.log('(Claude Code SDK not available - sending placeholder result)');

      this.client.sendTaskResult(
        task.id,
        true,
        'Task received but Claude Code SDK not available. Install @anthropic-ai/claude-code to enable AI execution.'
      );
      return;
    }

    try {
      // Use Claude Code SDK to execute the task
      const claude = this.claudeCode;
      if (!claude) return;

      const prompt = `${task.title}\n\n${task.description}`;
      let result = '';

      // Stream the response
      for await (const event of claude(prompt, { cwd: this.cwd })) {
        if (event.type === 'text') {
          result += event.content;

          // Send progress updates periodically
          if (result.length % 500 === 0) {
            this.client.sendTaskProgress(task.id, result.slice(-200));
          }
        } else if (event.type === 'result') {
          // Final result
          result = typeof event.result === 'string' ? event.result : JSON.stringify(event.result);
        }
      }

      console.log('Task completed successfully');
      this.client.sendTaskResult(task.id, true, result);

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
