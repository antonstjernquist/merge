import { Command } from 'commander';
import { WebSocketClient } from '../lib/websocket.js';
import { loadConfig, isConnected } from '../lib/config.js';
import type {
  WSMessage,
  RoomJoinedPayload,
  RoomLeftPayload,
  RoomMessagePayload,
  RoomTaskPayload,
  TaskCreatedPayload,
  TaskUpdatedPayload,
  TaskProgressPayload,
} from '@merge/shared-types';

function formatMessage(message: WSMessage): string {
  const time = new Date(message.timestamp).toLocaleTimeString();

  switch (message.type) {
    case 'room_joined': {
      const payload = message.payload as RoomJoinedPayload;
      return `[${time}] 🚪 ${payload.agent.name} joined room "${payload.room.name}"`;
    }
    case 'room_left': {
      const payload = message.payload as RoomLeftPayload;
      return `[${time}] 👋 ${payload.agent.name} left room`;
    }
    case 'room_message': {
      const payload = message.payload as RoomMessagePayload;
      const target = payload.message.toAgentId ? ` (DM)` : '';
      return `[${time}] 💬${target} ${payload.message.fromAgentId}: ${payload.message.content}`;
    }
    case 'room_task': {
      const payload = message.payload as RoomTaskPayload;
      const blocking = payload.task.blocking ? '🔒' : '📋';
      return `[${time}] ${blocking} New task: "${payload.task.title}" from ${payload.task.fromAgentId}`;
    }
    case 'task_created': {
      const payload = message.payload as TaskCreatedPayload;
      return `[${time}] ✅ Task created: ${payload.task.title} (${payload.task.id})`;
    }
    case 'task_assigned': {
      const payload = message.payload as TaskUpdatedPayload;
      return `[${time}] 📌 Task assigned: ${payload.task.title} -> ${payload.task.toAgentId}`;
    }
    case 'task_updated': {
      const payload = message.payload as TaskUpdatedPayload;
      return `[${time}] 🔄 Task updated: ${payload.task.title} [${payload.task.status}]`;
    }
    case 'task_completed': {
      const payload = message.payload as TaskUpdatedPayload;
      const status = payload.task.result?.success ? '✅' : '❌';
      return `[${time}] ${status} Task completed: ${payload.task.title}`;
    }
    case 'task_progress': {
      const payload = message.payload as TaskProgressPayload;
      return `[${time}] ⏳ Task progress (${payload.taskId}): ${payload.content.slice(0, 100)}...`;
    }
    case 'agent_connected': {
      return `[${time}] 🟢 Agent connected`;
    }
    case 'agent_disconnected': {
      return `[${time}] 🔴 Agent disconnected`;
    }
    case 'pong':
      return ''; // Don't log pong messages
    default:
      return `[${time}] ${message.type}: ${JSON.stringify(message.payload)}`;
  }
}

export const listenCommand = new Command('listen')
  .description('Listen for real-time messages and events via WebSocket')
  .option('--room <room>', 'Room to join (uses default from config if not specified)')
  .option('--json', 'Output raw JSON messages')
  .option('--types <types>', 'Filter by message types (comma-separated)')
  .action(async (options) => {
    if (!isConnected()) {
      console.error(JSON.stringify({
        success: false,
        error: 'Not connected. Run "agent-merge connect" first.',
      }));
      process.exit(1);
    }

    const config = loadConfig();
    const room = options.room || config.defaultRoom || 'default';
    const filterTypes = options.types ? options.types.split(',') : null;

    console.log(`Listening for events in room "${room}"...`);
    console.log('Press Ctrl+C to stop.\n');

    const client = new WebSocketClient({
      room,
      reconnect: true,
      onMessage: (message) => {
        // Filter by type if specified
        if (filterTypes && !filterTypes.includes(message.type)) {
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(message));
        } else {
          const formatted = formatMessage(message);
          if (formatted) {
            console.log(formatted);
          }
        }
      },
      onConnect: () => {
        console.log(`Connected to ${config.wsUrl}`);
      },
      onDisconnect: () => {
        console.log('Disconnected from server');
      },
      onError: (error) => {
        console.error(`WebSocket error: ${error.message}`);
      },
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      client.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      client.close();
      process.exit(0);
    });

    try {
      await client.connect();
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
      process.exit(1);
    }
  });
