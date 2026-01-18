import { Router, type IRouter } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { agentService } from '../services/agent.service.js';
import { taskService } from '../services/task.service.js';
import { config } from '../config.js';
import type { ConnectRequest, ConnectResponse, StatusResponse } from '@merge/shared-types';

const router: IRouter = Router();

// POST /api/v1/auth/connect - Connect as an agent
router.post('/connect', (req: AuthenticatedRequest, res) => {
  const { name, agentId: clientAgentId } = req.body as ConnectRequest;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  // Use client-provided agent ID if available
  const result = agentService.connect(
    name,
    config.sharedToken,
    'worker',
    [],
    null,
    clientAgentId
  );

  // Check if connection failed (ID already in use)
  if ('error' in result) {
    res.status(409).json({ error: result.error });
    return;
  }

  const response: ConnectResponse = {
    agent: result,
    token: config.sharedToken,
  };

  res.status(201).json(response);
});

// POST /api/v1/auth/disconnect - Disconnect agent
router.post('/disconnect', (req: AuthenticatedRequest, res) => {
  const agentId = req.agentId;

  if (!agentId) {
    res.status(400).json({ error: 'Agent ID required' });
    return;
  }

  const success = agentService.disconnect(agentId);

  if (!success) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }

  res.status(200).json({ success: true });
});

// GET /api/v1/auth/status - Get current status
router.get('/status', (req: AuthenticatedRequest, res) => {
  const agentId = req.agentId;
  const agent = agentId ? agentService.getAgent(agentId) : undefined;

  const pendingTasks = taskService.getPendingTasks(agentId);
  const activeTasks = agentId ? taskService.getActiveTasksForAgent(agentId) : [];

  const response: StatusResponse = {
    connected: !!agent,
    agent: agent ? { id: agent.id, name: agent.name } : undefined,
    pendingTasks: pendingTasks.length,
    activeTasks: activeTasks.length,
  };

  res.json(response);
});

export default router;
