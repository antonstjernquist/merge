import { Command } from 'commander';
import { disconnect } from '../lib/client.js';
import { clearSession, isConnected } from '../lib/config.js';

export const disconnectCommand = new Command('disconnect')
  .description('Disconnect from the merge relay server')
  .action(async () => {
    try {
      if (!isConnected()) {
        console.log(JSON.stringify({
          success: true,
          message: 'Not connected',
        }, null, 2));
        return;
      }

      await disconnect();
      clearSession();

      console.log(JSON.stringify({
        success: true,
        message: 'Disconnected successfully',
      }, null, 2));
    } catch (error) {
      // Still clear local session even if server request fails
      clearSession();
      console.log(JSON.stringify({
        success: true,
        message: 'Disconnected (local session cleared)',
        warning: error instanceof Error ? error.message : 'Server disconnect failed',
      }, null, 2));
    }
  });
