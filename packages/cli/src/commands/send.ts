import { Command } from 'commander';
import { createTask, waitForTaskCompletion } from '../lib/client.js';
import { isConnected } from '../lib/config.js';

export const sendCommand = new Command('send')
  .description('Send a task to another agent')
  .argument('<title>', 'Task title/description')
  .option('--description <desc>', 'Detailed task description')
  .option('--blocking', 'Wait for task completion (default)')
  .option('--non-blocking', 'Do not wait for task completion')
  .option('--timeout <seconds>', 'Timeout for blocking tasks in seconds', '300')
  .action(async (title, options) => {
    try {
      if (!isConnected()) {
        console.error(JSON.stringify({
          success: false,
          error: 'Not connected. Run "merge connect" first.',
        }, null, 2));
        process.exit(1);
      }

      const blocking = !options.nonBlocking;
      const description = options.description || title;

      const task = await createTask({
        title,
        description,
        blocking,
      });

      if (!blocking) {
        console.log(JSON.stringify({
          success: true,
          message: 'Task created',
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            blocking: task.blocking,
          },
        }, null, 2));
        return;
      }

      // Wait for completion
      console.error(`Waiting for task ${task.id} to complete...`);

      const completedTask = await waitForTaskCompletion(
        task.id,
        2000,
        parseInt(options.timeout, 10) * 1000 // Convert seconds to ms
      );

      console.log(JSON.stringify({
        success: true,
        task: {
          id: completedTask.id,
          title: completedTask.title,
          status: completedTask.status,
          result: completedTask.result,
        },
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Send failed',
      }, null, 2));
      process.exit(1);
    }
  });
