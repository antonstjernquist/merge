import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getState, isConnected } from '../lib/state.js';

export function registerStatusTool(server: McpServer) {
  server.tool(
    'merge_status',
    'Get current connection status and session information.',
    {},
    async () => {
      const state = getState();
      const connected = isConnected();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              connected,
              agentId: state.agentId,
              agentName: state.agentName,
              roomId: state.roomId,
              roomName: state.roomName,
              serverUrl: state.serverUrl,
            }, null, 2),
          },
        ],
      };
    }
  );
}
