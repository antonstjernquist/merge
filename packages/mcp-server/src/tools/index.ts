import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerConnectTool } from './connect.js';
import { registerStatusTool } from './status.js';
import { registerSendMessageTool } from './send-message.js';
import { registerCheckMessagesTool } from './check-messages.js';
import { registerSendTaskTool } from './send-task.js';
import { registerCheckTasksTool } from './check-tasks.js';
import { registerAcceptTaskTool } from './accept-task.js';
import { registerSubmitResultTool } from './submit-result.js';
import { registerListAgentsTool } from './list-agents.js';

export function registerAllTools(server: McpServer) {
  registerConnectTool(server);
  registerStatusTool(server);
  registerSendMessageTool(server);
  registerCheckMessagesTool(server);
  registerSendTaskTool(server);
  registerCheckTasksTool(server);
  registerAcceptTaskTool(server);
  registerSubmitResultTool(server);
  registerListAgentsTool(server);
}
