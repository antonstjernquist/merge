import { Command } from 'commander';
import { submitResult } from '../lib/client.js';
import { isConnected } from '../lib/config.js';

export const resultCommand = new Command('result')
  .description('Submit result for a task')
  .argument('<taskId>', 'Task ID')
  .option('--success', 'Mark task as successful')
  .option('--failure', 'Mark task as failed')
  .option('--output <output>', 'Result output message')
  .option('--error <error>', 'Error message (for failures)')
  .action(async (taskId, options) => {
    try {
      if (!isConnected()) {
        console.error(JSON.stringify({
          success: false,
          error: 'Not connected. Run "merge connect" first.',
        }, null, 2));
        process.exit(1);
      }

      if (!options.success && !options.failure) {
        console.error(JSON.stringify({
          success: false,
          error: 'Must specify --success or --failure',
        }, null, 2));
        process.exit(1);
      }

      const isSuccess = options.success && !options.failure;

      const task = await submitResult(
        taskId,
        isSuccess,
        options.output,
        options.error
      );

      console.log(JSON.stringify({
        success: true,
        message: 'Result submitted',
        task: {
          id: task.id,
          title: task.title,
          status: task.status,
          result: task.result,
        },
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Result submission failed',
      }, null, 2));
      process.exit(1);
    }
  });
