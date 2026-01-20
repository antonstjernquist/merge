import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTask, waitForTaskCompletion } from '../lib/client.js';
import { getState, isConnected } from '../lib/state.js';

const sendTaskSchema = z.object({
  title: z.string().describe('Short title for the task'),
  description: z.string().describe('Detailed task description'),
  blocking: z.boolean().optional().default(true).describe('Wait for result (true) or return immediately (false)'),
  toAgentId: z.string().optional().describe('Optional specific agent ID to assign the task to'),
  timeoutSeconds: z.number().optional().default(300).describe('Timeout in seconds for blocking tasks'),
});

export function registerSendTaskTool(server: McpServer) {
  server.tool(
    'merge_send_task',
    'Send a task to another agent in the room. Can wait for completion (blocking) or return immediately.',
    sendTaskSchema.shape,
    async (args) => {
      if (!isConnected()) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Not connected. Call merge_connect first.',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const { title, description, blocking, toAgentId, timeoutSeconds } = sendTaskSchema.parse(args);
      const state = getState();

      try {
        const task = await createTask({
          title,
          description,
          blocking,
          toAgentId,
        });

        if (!blocking) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  taskId: task.id,
                  status: task.status,
                  message: 'Task created. Use merge_check_tasks to monitor progress.',
                }, null, 2),
              },
            ],
          };
        }

        const completedTask = await waitForTaskCompletion(task.id, 2000, timeoutSeconds * 1000);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: completedTask.status === 'completed',
                taskId: completedTask.id,
                status: completedTask.status,
                result: completedTask.result,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
