import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { joinRoom } from '../lib/client.js';
import { updateState, getState } from '../lib/state.js';
import { saveSession } from '../lib/config.js';
import type { AgentRole } from '@merge/shared-types';

const connectSchema = z.object({
  room: z.string().describe('Room name or ID to join'),
  name: z.string().describe('Agent name to display'),
  role: z.enum(['leader', 'worker', 'both']).optional().default('both').describe('Agent role in the room'),
  skills: z.array(z.string()).optional().default([]).describe('Skills this agent has'),
  roomKey: z.string().optional().describe('Optional room key for locked rooms'),
});

export function registerConnectTool(server: McpServer) {
  server.tool(
    'merge_connect',
    'Join a merge collaboration room. Must be called before using other merge tools.',
    connectSchema.shape,
    async (args) => {
      const { room, name, role, skills, roomKey } = connectSchema.parse(args);

      try {
        const response = await joinRoom(room, name, role as AgentRole, skills, roomKey);

        updateState({
          token: response.token,
          roomId: response.room.id,
          roomName: response.room.name,
          agentName: name,
        });

        saveSession({
          roomName: room,
          agentName: name,
          role: role as AgentRole,
          skills,
          roomKey,
        });

        const state = getState();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                agentId: state.agentId,
                agentName: name,
                roomId: response.room.id,
                roomName: response.room.name,
                role: response.agent.role,
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
