import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getRoomAgents } from '../lib/client.js';
import { getState, isConnected } from '../lib/state.js';

export function registerListAgentsTool(server: McpServer) {
  server.tool(
    'merge_list_agents',
    'List all agents currently in the room.',
    {},
    async () => {
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

      const state = getState();

      try {
        const agents = await getRoomAgents(state.roomId!);

        const agentList = agents.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          skills: a.skills,
          isConnected: a.isConnected,
          isMe: a.id === state.agentId,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                agentCount: agentList.length,
                agents: agentList,
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
