import type {
  Task,
  CreateTaskRequest,
  CreateTaskResponse,
  GetTasksResponse,
  AcceptTaskResponse,
  SubmitResultResponse,
  APIError,
  JoinRoomWithTokenResponse,
  GetRoomAgentsResponse,
  AgentRole,
  AgentInfo,
  RoomMessage,
} from '@merge/shared-types';
import { getState } from './state.js';

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const state = getState();
  const url = `${state.serverUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  if (state.agentId) {
    headers['X-Agent-Id'] = state.agentId;
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

export async function joinRoom(
  roomId: string,
  name: string,
  role: AgentRole,
  skills: string[],
  roomKey?: string
): Promise<JoinRoomWithTokenResponse> {
  const state = getState();
  const sharedToken = process.env.MERGE_TOKEN;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (sharedToken) {
    headers['Authorization'] = `Bearer ${sharedToken}`;
  }

  const response = await fetch(`${state.serverUrl}/api/v1/rooms/${encodeURIComponent(roomId)}/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      role,
      skills,
      roomKey,
      agentId: state.agentId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as APIError;
    throw new Error(error.error || `Join room failed: ${response.status}`);
  }

  return data as JoinRoomWithTokenResponse;
}

export async function getRoomAgents(roomId: string): Promise<AgentInfo[]> {
  const response = await request<GetRoomAgentsResponse>('GET', `/api/v1/rooms/${encodeURIComponent(roomId)}/agents`);
  return response.agents;
}

export async function getRoomMessages(roomId: string, since?: string): Promise<RoomMessage[]> {
  let path = `/api/v1/rooms/${encodeURIComponent(roomId)}/messages`;
  if (since) {
    path += `?since=${encodeURIComponent(since)}`;
  }
  const response = await request<{ messages: RoomMessage[] }>('GET', path);
  return response.messages;
}

export async function sendMessage(roomId: string, content: string, toAgentId?: string): Promise<RoomMessage> {
  const response = await request<{ message: RoomMessage }>('POST', `/api/v1/rooms/${encodeURIComponent(roomId)}/messages`, {
    content,
    toAgentId,
  });
  return response.message;
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

export async function deleteTask(taskId: string): Promise<void> {
  await request<{ success: boolean }>('DELETE', `/api/v1/tasks/${taskId}`);
}
