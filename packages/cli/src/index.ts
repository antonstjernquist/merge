#!/usr/bin/env node
import { Command } from 'commander';
import { connectCommand } from './commands/connect.js';
import { disconnectCommand } from './commands/disconnect.js';
import { sendCommand } from './commands/send.js';
import { pollCommand } from './commands/poll.js';
import { acceptCommand } from './commands/accept.js';
import { resultCommand } from './commands/result.js';
import { statusCommand } from './commands/status.js';
import { taskCommand } from './commands/task.js';
import { tasksCommand } from './commands/tasks.js';

const program = new Command();

program
  .name('merge')
  .description('Claude Code Agent Collaboration CLI')
  .version('0.1.0');

// Add all commands
program.addCommand(connectCommand);
program.addCommand(disconnectCommand);
program.addCommand(sendCommand);
program.addCommand(pollCommand);
program.addCommand(acceptCommand);
program.addCommand(resultCommand);
program.addCommand(statusCommand);
program.addCommand(taskCommand);
program.addCommand(tasksCommand);

program.parse();
