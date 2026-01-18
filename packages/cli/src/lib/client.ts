import type {
  Task,
  CreateTaskRequest,
  CreateTaskResponse,
  GetTasksResponse,
  AcceptTaskResponse,
  SubmitResultResponse,
  ConnectResponse,
  StatusResponse,
  APIError,
  JoinRoomWithTokenResponse,
  GetRoomAgentsResponse,
  AgentRole,
  AgentInfo,
} from '@merge/shared-types';
import { loadConfig } from './config.js';

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const config = loadConfig();
  const url = `${config.serverUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  if (config.agentId) {
    headers['X-Agent-Id'] = config.agentId;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as APIError;
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return data as T;
}

export async function connect(name: string, token: string, serverUrl?: string): Promise<ConnectResponse> {
  const config = loadConfig();
  const url = serverUrl || config.serverUrl;

  // Send client-controlled agent ID
  const response = await fetch(`${url}/api/v1/auth/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
      agentId: config.agentId, // Client-provided persistent ID
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as APIError;
    throw new Error(error.error || `Connect failed: ${response.status}`);
  }

  return data as ConnectResponse;
}

export async function disconnect(): Promise<void> {
  await request<{ success: boolean }>('POST', '/api/v1/auth/disconnect');
}

export async function getStatus(): Promise<StatusResponse> {
  return request<StatusResponse>('GET', '/api/v1/auth/status');
}

export async function createTask(taskRequest: CreateTaskRequest): Promise<Task> {
  const response = await request<CreateTaskResponse>('POST', '/api/v1/tasks', taskRequest);
  return response.task;
}

export async function getTasks(): Promise<Task[]> {
  const response = await request<GetTasksResponse>('GET', '/api/v1/tasks');
  return response.tasks;
}

export async function getPendingTasks(): Promise<Task[]> {
  const response = await request<GetTasksResponse>('GET', '/api/v1/tasks/pending');
  return response.tasks;
}

export async function getTask(taskId: string): Promise<Task> {
  const response = await request<{ task: Task }>('GET', `/api/v1/tasks/${taskId}`);
  return response.task;
}

export async function acceptTask(taskId: string): Promise<Task> {
  const response = await request<AcceptTaskResponse>('PATCH', `/api/v1/tasks/${taskId}/accept`);
  return response.task;
}

export async function submitResult(
  taskId: string,
  success: boolean,
  output?: string,
  error?: string
): Promise<Task> {
  const response = await request<SubmitResultResponse>('PATCH', `/api/v1/tasks/${taskId}/result`, {
    success,
    output,
    error,
  });
  return response.task;
}

export async function waitForTaskCompletion(
  taskId: string,
  pollIntervalMs: number = 2000,
  timeoutMs: number = 300000
): Promise<Task> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const task = await getTask(taskId);

    if (task.status === 'completed' || task.status === 'failed') {
      return task;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Task ${taskId} did not complete within timeout`);
}

export async function joinRoom(
  roomId: string,
  name: string,
  role: AgentRole,
  skills: string[],
  roomKey?: string,
  serverUrl?: string,
  token?: string
): Promise<JoinRoomWithTokenResponse> {
  const config = loadConfig();
  const url = serverUrl || config.serverUrl;
  const authToken = token || config.token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization if token available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Send client-controlled agent ID
  const response = await fetch(`${url}/api/v1/rooms/${encodeURIComponent(roomId)}/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      role,
      skills,
      roomKey,
      agentId: config.agentId, // Client-provided persistent ID
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as APIError;
    throw new Error(error.error || `Join room failed: ${response.status}`);
  }

  return data as JoinRoomWithTokenResponse;
}

export async function getRoomAgents(roomId?: string): Promise<AgentInfo[]> {
  const config = loadConfig();
  const room = roomId || config.defaultRoom || 'default';
  const response = await request<GetRoomAgentsResponse>('GET', `/api/v1/rooms/${encodeURIComponent(room)}/agents`);
  return response.agents;
}
