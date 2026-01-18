import { Router, type Request, type Response } from 'express';
import type { CreateRoomRequest } from '@merge/shared-types';
import { roomService } from '../services/room.service.js';

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

// Join a room
router.post('/:roomId/join', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const agentId = req.headers['x-agent-id'] as string;

  if (!agentId) {
    res.status(401).json({ error: 'Agent ID required' });
    return;
  }

  const room = roomService.joinRoom(roomId, agentId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  res.json({ room });
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
