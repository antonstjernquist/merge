import { Command } from 'commander';
import { connect } from '../lib/client.js';
import { updateConfig, loadConfig, getConfigPath } from '../lib/config.js';

export const connectCommand = new Command('connect')
  .description('Connect to the merge relay server')
  .requiredOption('--token <token>', 'Authentication token')
  .requiredOption('--name <name>', 'Agent name')
  .option('--server <url>', 'Server URL (default: http://localhost:3000)')
  .option('--room <room>', 'Default room to join (default: "default")')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const serverUrl = options.server || config.serverUrl;

      const response = await connect(options.name, options.token, serverUrl);

      updateConfig({
        serverUrl,
        wsUrl: serverUrl.replace(/^http/, 'ws'),
        token: options.token,
        // agentId is persistent and client-controlled - don't overwrite
        agentName: response.agent.name,
        defaultRoom: options.room || 'default',
      });

      console.log(JSON.stringify({
        success: true,
        message: 'Connected successfully',
        agent: {
          id: config.agentId, // Persistent client-controlled ID
          name: response.agent.name,
        },
        configPath: getConfigPath(),
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }, null, 2));
      process.exit(1);
    }
  });
