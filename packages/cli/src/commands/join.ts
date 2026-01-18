import { Command } from 'commander';
import { joinRoom } from '../lib/client.js';
import { updateConfig, loadConfig, getConfigPath } from '../lib/config.js';
import type { AgentRole } from '@merge/shared-types';

export const joinCommand = new Command('join')
  .description('Join a room with optional API key protection')
  .argument('<room>', 'Room name or ID to join')
  .requiredOption('--name <name>', 'Agent name')
  .option('--key <key>', 'Room API key (locks room on first join)')
  .option('--role <role>', 'Agent role: leader, worker, or both (default: worker)', 'worker')
  .option('--skills <skills>', 'Comma-separated list of skills')
  .option('--server <url>', 'Server URL')
  .action(async (room, options) => {
    try {
      const config = loadConfig();
      const serverUrl = options.server || config.serverUrl;

      const role = (options.role || 'worker') as AgentRole;
      const skills = options.skills ? options.skills.split(',').map((s: string) => s.trim()) : [];

      const response = await joinRoom(
        room,
        options.name,
        role,
        skills,
        options.key,
        serverUrl
      );

      updateConfig({
        serverUrl,
        wsUrl: serverUrl.replace(/^http/, 'ws'),
        token: response.token,
        agentId: response.agent.id,
        agentName: response.agent.name,
        defaultRoom: response.room.name,
        roomKey: options.key,
        role,
        skills,
      });

      console.log(JSON.stringify({
        success: true,
        message: 'Joined room successfully',
        agent: {
          id: response.agent.id,
          name: response.agent.name,
          role: response.agent.role,
          skills: response.agent.skills,
        },
        room: {
          id: response.room.id,
          name: response.room.name,
          isLocked: response.room.isLocked,
        },
        configPath: getConfigPath(),
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Join failed',
      }, null, 2));
      process.exit(1);
    }
  });
