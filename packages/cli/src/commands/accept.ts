import { Command } from 'commander';
import { acceptTask } from '../lib/client.js';
import { isConnected } from '../lib/config.js';

export const acceptCommand = new Command('accept')
  .description('Accept a pending task')
  .argument('<taskId>', 'Task ID to accept')
  .action(async (taskId) => {
    try {
      if (!isConnected()) {
        console.error(JSON.stringify({
          success: false,
          error: 'Not connected. Run "merge connect" first.',
        }, null, 2));
        process.exit(1);
      }

      const task = await acceptTask(taskId);

      console.log(JSON.stringify({
        success: true,
        message: 'Task accepted',
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          blocking: task.blocking,
          status: task.status,
        },
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Accept failed',
      }, null, 2));
      process.exit(1);
    }
  });
