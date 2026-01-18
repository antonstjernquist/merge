import { Command } from 'commander';
import { getRoomAgents } from '../lib/client.js';
import { isConnected, loadConfig } from '../lib/config.js';

export const agentsCommand = new Command('agents')
  .description('List agents in a room')
  .option('--room <room>', 'Room name or ID (defaults to current room)')
  .action(async (options) => {
    try {
      if (!isConnected()) {
        console.error(JSON.stringify({
          success: false,
          error: 'Not connected. Run "agent-merge connect" or "agent-merge join" first.',
        }, null, 2));
        process.exit(1);
      }

      const config = loadConfig();
      const roomId = options.room || config.defaultRoom || 'default';

      const agents = await getRoomAgents(roomId);

      console.log(JSON.stringify({
        success: true,
        room: roomId,
        agents: agents.map(agent => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          skills: agent.skills,
          isConnected: agent.isConnected,
        })),
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agents',
      }, null, 2));
      process.exit(1);
    }
  });
