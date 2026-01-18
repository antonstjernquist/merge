import { Command } from 'commander';
import { getTask } from '../lib/client.js';
import { isConnected } from '../lib/config.js';

export const taskCommand = new Command('task')
  .description('Get details of a specific task')
  .argument('<taskId>', 'Task ID')
  .action(async (taskId) => {
    try {
      if (!isConnected()) {
        console.error(JSON.stringify({
          success: false,
          error: 'Not connected. Run "merge connect" first.',
        }, null, 2));
        process.exit(1);
      }

      const task = await getTask(taskId);

      console.log(JSON.stringify({
        success: true,
        task,
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Task lookup failed',
      }, null, 2));
      process.exit(1);
    }
  });
