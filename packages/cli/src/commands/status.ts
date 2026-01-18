import { Command } from 'commander';
import { getStatus } from '../lib/client.js';
import { loadConfig, isConnected } from '../lib/config.js';

export const statusCommand = new Command('status')
  .description('Show current connection status')
  .action(async () => {
    try {
      const config = loadConfig();

      if (!isConnected()) {
        console.log(JSON.stringify({
          connected: false,
          serverUrl: config.serverUrl,
          message: 'Not connected. Run "merge connect" to connect.',
        }, null, 2));
        return;
      }

      const status = await getStatus();

      console.log(JSON.stringify({
        connected: status.connected,
        agent: status.agent,
        serverUrl: config.serverUrl,
        pendingTasks: status.pendingTasks,
        activeTasks: status.activeTasks,
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed',
      }, null, 2));
      process.exit(1);
    }
  });
