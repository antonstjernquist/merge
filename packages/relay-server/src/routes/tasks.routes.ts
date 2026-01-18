import { Router, type IRouter } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAgent } from '../middleware/auth.js';
import { taskService } from '../services/task.service.js';
import { agentService } from '../services/agent.service.js';
import { roomService } from '../services/room.service.js';
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  GetTasksResponse,
  AcceptTaskResponse,
  SubmitResultRequest,
  SubmitResultResponse,
} from '@merge/shared-types';

// Helper to resolve room name/id to UUID
function resolveRoomId(nameOrId: string): string {
  const room = roomService.getRoom(nameOrId) || roomService.getRoomByName(nameOrId);
  return room?.id || nameOrId;
}

const router: IRouter = Router();

// POST /api/v1/tasks - Create a new task
router.post('/', requireAgent, (req: AuthenticatedRequest, res) => {
  const agentId = req.agentId!;
  const body = req.body as CreateTaskRequest & { roomId?: string };

  if (!body.title || typeof body.title !== 'string') {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  if (!body.description || typeof body.description !== 'string') {
    res.status(400).json({ error: 'Description is required' });
    return;
  }

  const agent = agentService.getAgent(agentId);
  const rawRoomId = body.roomId || agent?.currentRoomId || 'default';
  const roomId = resolveRoomId(rawRoomId);

  const task = taskService.createTask(agentId, roomId, body);

  const response: CreateTaskResponse = { task };
  res.status(201).json(response);
});

// GET /api/v1/tasks - Get all tasks
router.get('/', requireAgent, (req: AuthenticatedRequest, res) => {
  const agentId = req.agentId!;
  const tasks = taskService.getTasksForAgent(agentId);

  const response: GetTasksResponse = { tasks };
  res.json(response);
});

// GET /api/v1/tasks/pending - Get pending tasks (for workers to poll)
router.get('/pending', requireAgent, (req: AuthenticatedRequest, res) => {
  const agentId = req.agentId!;
  const agent = agentService.getAgent(agentId);
  const rawRoomId = (req.query.roomId as string) || agent?.currentRoomId || 'default';
  const roomId = resolveRoomId(rawRoomId);
  const agentSkills = agent?.skills || [];

  const tasks = taskService.getPendingTasksForAgent(agentId, roomId, agentSkills);

  const response: GetTasksResponse = { tasks };
  res.json(response);
});

// GET /api/v1/tasks/:id - Get a specific task
router.get('/:id', requireAgent, (req: AuthenticatedRequest, res) => {
  const task = taskService.getTask(req.params.id);

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  res.json({ task });
});

// PATCH /api/v1/tasks/:id/accept - Accept a task
router.patch('/:id/accept', requireAgent, (req: AuthenticatedRequest, res) => {
  const agentId = req.agentId!;
  const taskId = req.params.id;

  const task = taskService.acceptTask(taskId, agentId);

  if (!task) {
    res.status(400).json({ error: 'Cannot accept task. It may not exist, already be assigned, or be your own task.' });
    return;
  }

  const response: AcceptTaskResponse = { task };
  res.json(response);
});

// PATCH /api/v1/tasks/:id/status - Update task status
router.patch('/:id/status', requireAgent, (req: AuthenticatedRequest, res) => {
  const agentId = req.agentId!;
  const taskId = req.params.id;
  const { status } = req.body;

  if (!['in_progress'].includes(status)) {
    res.status(400).json({ error: 'Invalid status. Use "in_progress".' });
    return;
  }

  const task = taskService.updateTaskStatus(taskId, agentId, status);

  if (!task) {
    res.status(400).json({ error: 'Cannot update task. It may not exist or not be assigned to you.' });
    return;
  }

  res.json({ task });
});

// PATCH /api/v1/tasks/:id/result - Submit task result
router.patch('/:id/result', requireAgent, (req: AuthenticatedRequest, res) => {
  const agentId = req.agentId!;
  const taskId = req.params.id;
  const body = req.body as SubmitResultRequest;

  if (typeof body.success !== 'boolean') {
    res.status(400).json({ error: 'Success field is required' });
    return;
  }

  const task = taskService.submitResult(taskId, agentId, {
    success: body.success,
    output: body.output,
    error: body.error,
  });

  if (!task) {
    res.status(400).json({ error: 'Cannot submit result. Task may not exist or not be assigned to you.' });
    return;
  }

  const response: SubmitResultResponse = { task };
  res.json(response);
});

export default router;
