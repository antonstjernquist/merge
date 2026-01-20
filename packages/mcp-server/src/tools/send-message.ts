import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sendMessage } from '../lib/client.js';
import { getState, isConnected } from '../lib/state.js';

const sendMessageSchema = z.object({
  content: z.string().describe('Message content to send'),
  toAgentId: z.string().optional().describe('Optional agent ID for direct message (omit for broadcast)'),
});

export function registerSendMessageTool(server: McpServer) {
  server.tool(
    'merge_send_message',
    'Send a chat message to the room or a specific agent.',
    sendMessageSchema.shape,
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

      const { content, toAgentId } = sendMessageSchema.parse(args);
      const state = getState();

      try {
        const message = await sendMessage(state.roomId!, content, toAgentId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                messageId: message.id,
                timestamp: message.timestamp,
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
