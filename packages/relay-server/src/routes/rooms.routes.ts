import { Router, type Request, type Response } from 'express';
import type { CreateRoomRequest, JoinRoomRequest, JoinRoomWithTokenResponse, GetRoomAgentsResponse } from '@merge/shared-types';
import { roomService } from '../services/room.service.js';
import { agentService } from '../services/agent.service.js';

const router: Router = Router();

// Get all rooms
router.get('/', (_req: Request, res: Response) => {
  const rooms = roomService.getAllRooms();
  res.json({ rooms });
});

// Get a specific room with messages
router.get('/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = roomService.getRoom(roomId) || roomService.getRoomByName(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const messages = roomService.getRoomMessages(room.id);
  res.json({ room, messages });
});

// Create a new room
router.post('/', (req: Request, res: Response) => {
  const { name } = req.body as CreateRoomRequest;

  if (!name) {
    res.status(400).json({ error: 'Room name is required' });
    return;
  }

  const room = roomService.createRoom(name);
  res.status(201).json({ room });
});

// Join a room (with optional key for new agents)
router.post('/:roomId/join', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const body = req.body as JoinRoomRequest;
  const existingAgentId = req.headers['x-agent-id'] as string;

  if (!body.name && !existingAgentId) {
    res.status(400).json({ error: 'Agent name required for new agents' });
    return;
  }

  let room = roomService.getRoom(roomId) || roomService.getRoomByName(roomId);

  if (!room) {
    room = roomService.createRoom(roomId);
  }

  if (room.isLocked) {
    if (!body.roomKey) {
      res.status(401).json({ error: 'Room key required' });
      return;
    }
    if (!roomService.validateRoomKey(room.id, body.roomKey)) {
      res.status(403).json({ error: 'Invalid room key' });
      return;
    }
  }

  let agent;
  let token;

  if (existingAgentId) {
    agent = agentService.getAgent(existingAgentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    token = agent.token;
    agentService.setAgentRoom(agent.id, room.id);
  } else {
    agent = agentService.connect(
      body.name,
      '',
      body.role || 'worker',
      body.skills || [],
      room.id
    );
    token = agent.token;
  }

  if (body.roomKey && !room.isLocked) {
    roomService.lockRoom(room.id, body.roomKey, agent.id);
    room = roomService.getRoom(room.id)!;
  }

  roomService.joinRoom(room.id, agent.id);

  const response: JoinRoomWithTokenResponse = {
    agent,
    room,
    token,
  };

  res.status(200).json(response);
});

// Get agents in a room
router.get('/:roomId/agents', (req: Request, res: Response) => {
  const { roomId } = req.params;

  const room = roomService.getRoom(roomId) || roomService.getRoomByName(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const agentIds = roomService.getRoomAgentIds(room.id);
  const agents = agentIds
    .map((id) => agentService.getAgent(id))
    .filter((a) => a !== undefined)
    .map((a) => agentService.getAgentInfo(a!));

  const response: GetRoomAgentsResponse = { agents };
  res.json(response);
});

// Leave a room
router.post('/:roomId/leave', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const agentId = req.headers['x-agent-id'] as string;

  if (!agentId) {
    res.status(401).json({ error: 'Agent ID required' });
    return;
  }

  const left = roomService.leaveRoom(roomId, agentId);

  if (!left) {
    res.status(404).json({ error: 'Room not found or not a member' });
    return;
  }

  res.json({ success: true });
});

// Get room messages
router.get('/:roomId/messages', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const room = roomService.getRoom(roomId) || roomService.getRoomByName(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const messages = roomService.getRoomMessages(room.id, limit);
  res.json({ messages });
});

export default router;
