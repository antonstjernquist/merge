import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getRoomMessages } from '../lib/client.js';
import { getState, isConnected, updateState } from '../lib/state.js';

const checkMessagesSchema = z.object({
  since: z.string().optional().describe('ISO timestamp to get messages after (omit for new messages since last check)'),
  all: z.boolean().optional().default(false).describe('Get all messages instead of just new ones'),
});

export function registerCheckMessagesTool(server: McpServer) {
  server.tool(
    'merge_check_messages',
    'Check for new messages in the room.',
    checkMessagesSchema.shape,
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

      const { since, all } = checkMessagesSchema.parse(args);
      const state = getState();

      try {
        const sinceTimestamp = all ? undefined : (since || state.lastMessageTimestamp || undefined);
        const messages = await getRoomMessages(state.roomId!, sinceTimestamp);

        if (messages.length > 0) {
          const latestTimestamp = messages[messages.length - 1].timestamp;
          updateState({ lastMessageTimestamp: latestTimestamp });
        }

        const filteredMessages = messages
          .filter((m) => m.fromAgentId !== state.agentId)
          .map((m) => ({
            id: m.id,
            fromAgentId: m.fromAgentId,
            toAgentId: m.toAgentId,
            content: m.content,
            timestamp: m.timestamp,
            isDirect: m.toAgentId === state.agentId,
          }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                messageCount: filteredMessages.length,
                messages: filteredMessages,
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
