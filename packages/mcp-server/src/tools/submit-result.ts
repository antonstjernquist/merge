import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { submitResult } from '../lib/client.js';
import { isConnected } from '../lib/state.js';

const submitResultSchema = z.object({
  taskId: z.string().describe('ID of the task to submit result for'),
  success: z.boolean().describe('Whether the task completed successfully'),
  output: z.string().optional().describe('Task output on success'),
  error: z.string().optional().describe('Error message on failure'),
});

export function registerSubmitResultTool(server: McpServer) {
  server.tool(
    'merge_submit_result',
    'Submit the result of an accepted task.',
    submitResultSchema.shape,
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

      const { taskId, success, output, error } = submitResultSchema.parse(args);

      try {
        const task = await submitResult(taskId, success, output, error);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task: {
                  id: task.id,
                  title: task.title,
                  status: task.status,
                  result: task.result,
                },
              }, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
