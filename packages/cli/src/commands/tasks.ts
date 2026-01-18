import { Command } from 'commander';
import { getTasks } from '../lib/client.js';
import { isConnected } from '../lib/config.js';

export const tasksCommand = new Command('tasks')
  .description('List all tasks related to this agent')
  .option('--status <status>', 'Filter by status (pending, assigned, in_progress, completed, failed)')
  .action(async (options) => {
    try {
      if (!isConnected()) {
        console.error(JSON.stringify({
          success: false,
          error: 'Not connected. Run "merge connect" first.',
        }, null, 2));
        process.exit(1);
      }

      let tasks = await getTasks();

      if (options.status) {
        tasks = tasks.filter((task) => task.status === options.status);
      }

      console.log(JSON.stringify({
        success: true,
        count: tasks.length,
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          blocking: task.blocking,
          fromAgentId: task.fromAgentId,
          toAgentId: task.toAgentId,
          createdAt: task.createdAt,
          result: task.result,
        })),
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Tasks lookup failed',
      }, null, 2));
      process.exit(1);
    }
  });
