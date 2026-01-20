import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { acceptTask } from '../lib/client.js';
import { isConnected } from '../lib/state.js';

const acceptTaskSchema = z.object({
  taskId: z.string().describe('ID of the task to accept'),
});

export function registerAcceptTaskTool(server: McpServer) {
  server.tool(
    'merge_accept_task',
    'Accept a pending task for execution. After accepting, execute the task and submit results.',
    acceptTaskSchema.shape,
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

      const { taskId } = acceptTaskSchema.parse(args);

      try {
        const task = await acceptTask(taskId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task: {
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  status: task.status,
                  fromAgentId: task.fromAgentId,
                  blocking: task.blocking,
                },
                instructions: 'Task accepted. Execute the task and call merge_submit_result when done.',
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
