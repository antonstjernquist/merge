import { Command } from 'commander';
import { getPendingTasks } from '../lib/client.js';
import { isConnected } from '../lib/config.js';

export const pollCommand = new Command('poll')
  .description('Poll for pending tasks')
  .action(async () => {
    try {
      if (!isConnected()) {
        console.error(JSON.stringify({
          success: false,
          error: 'Not connected. Run "merge connect" first.',
        }, null, 2));
        process.exit(1);
      }

      const tasks = await getPendingTasks();

      console.log(JSON.stringify({
        success: true,
        count: tasks.length,
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          blocking: task.blocking,
          createdAt: task.createdAt,
        })),
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Poll failed',
      }, null, 2));
      process.exit(1);
    }
  });
