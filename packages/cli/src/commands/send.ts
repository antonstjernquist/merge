import { Command } from 'commander';
import { createTask, waitForTaskCompletion } from '../lib/client.js';
import { isConnected, loadConfig } from '../lib/config.js';
import type { TaskTarget } from '@merge/shared-types';

export const sendCommand = new Command('send')
  .description('Send a task to another agent')
  .argument('<title>', 'Task title/description')
  .option('--description <desc>', 'Detailed task description')
  .option('--blocking', 'Wait for task completion (default)')
  .option('--non-blocking', 'Do not wait for task completion')
  .option('--timeout <seconds>', 'Timeout for blocking tasks in seconds', '300')
  .option('--to <agent>', 'Send to specific agent by name')
  .option('--to-skill <skill>', 'Route to agent with specific skill')
  .option('--broadcast', 'Send to all workers in the room')
  .option('--room <room>', 'Target room (defaults to current room)')
  .action(async (title, options) => {
    try {
      if (!isConnected()) {
        console.error(JSON.stringify({
          success: false,
          error: 'Not connected. Run "agent-merge connect" or "agent-merge join" first.',
        }, null, 2));
        process.exit(1);
      }

      const blocking = !options.nonBlocking;
      const description = options.description || title;
      const config = loadConfig();

      const target: TaskTarget | undefined = options.to
        ? { agentName: options.to }
        : options.toSkill
          ? { skill: options.toSkill }
          : options.broadcast
            ? { broadcast: true }
            : undefined;

      const task = await createTask({
        title,
        description,
        blocking,
        target,
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
