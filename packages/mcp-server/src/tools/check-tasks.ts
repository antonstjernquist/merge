import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getPendingTasks, getTasks, getTask } from '../lib/client.js';
import { isConnected } from '../lib/state.js';

const checkTasksSchema = z.object({
  taskId: z.string().optional().describe('Specific task ID to check (omit for pending tasks)'),
  all: z.boolean().optional().default(false).describe('Get all tasks instead of just pending'),
});

export function registerCheckTasksTool(server: McpServer) {
  server.tool(
    'merge_check_tasks',
    'Check for pending tasks or get status of a specific task.',
    checkTasksSchema.shape,
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

      const { taskId, all } = checkTasksSchema.parse(args);

      try {
        if (taskId) {
          const task = await getTask(taskId);
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
                    toAgentId: task.toAgentId,
                    result: task.result,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt,
                  },
                }, null, 2),
              },
            ],
          };
        }

        const tasks = all ? await getTasks() : await getPendingTasks();
        const taskList = tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          fromAgentId: t.fromAgentId,
          toAgentId: t.toAgentId,
          createdAt: t.createdAt,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                taskCount: taskList.length,
                tasks: taskList,
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
