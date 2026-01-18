import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { agentService } from '../services/agent.service.js';

export interface AuthenticatedRequest extends Request {
  agentId?: string;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Invalid Authorization header format' });
    return;
  }

  // Validate shared token
  if (token !== config.sharedToken) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Get agent ID from X-Agent-Id header
  const agentId = req.headers['x-agent-id'] as string | undefined;

  if (agentId) {
    const agent = agentService.getAgent(agentId);
    if (!agent) {
      res.status(401).json({ error: 'Agent not found or session expired' });
      return;
    }
    req.agentId = agentId;
    agentService.updateLastSeen(agentId);
  }

  next();
}

export function requireAgent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.agentId) {
    res.status(401).json({ error: 'Agent ID required. Connect first.' });
    return;
  }
  next();
}
