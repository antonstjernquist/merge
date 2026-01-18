// Task status enum
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';

// Task result interface
export interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Core Task interface
export interface Task {
  id: string;
  fromAgentId: string;
  toAgentId: string | null;
  title: string;
  description: string;
  blocking: boolean;
  status: TaskStatus;
  result?: TaskResult;
  createdAt: string;
  updatedAt: string;
}

// Agent interface
export interface Agent {
  id: string;
  name: string;
  token: string;
  connectedAt: string;
  lastSeenAt: string;
  isConnected: boolean;
}

// WebSocket message types
export type WSMessageType =
  | 'task_created'
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'agent_connected'
  | 'agent_disconnected'
  | 'ping'
  | 'pong';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: string;
}

export interface TaskCreatedPayload {
  task: Task;
}

export interface TaskUpdatedPayload {
  task: Task;
}

export interface AgentEventPayload {
  agent: Pick<Agent, 'id' | 'name'>;
}

// API Request/Response types
export interface CreateTaskRequest {
  title: string;
  description: string;
  blocking?: boolean;
  toAgentId?: string;
}

export interface CreateTaskResponse {
  task: Task;
}

export interface GetTasksResponse {
  tasks: Task[];
}

export interface AcceptTaskResponse {
  task: Task;
}

export interface SubmitResultRequest {
  success: boolean;
  output?: string;
  error?: string;
}

export interface SubmitResultResponse {
  task: Task;
}

export interface ConnectRequest {
  name: string;
}

export interface ConnectResponse {
  agent: Agent;
  token: string;
}

export interface StatusResponse {
  connected: boolean;
  agent?: Pick<Agent, 'id' | 'name'>;
  pendingTasks: number;
  activeTasks: number;
}

// CLI config interface
export interface CLIConfig {
  serverUrl: string;
  wsUrl: string;
  token?: string;
  agentId?: string;
  agentName?: string;
}

// API Error response
export interface APIError {
  error: string;
  code?: string;
  details?: unknown;
}
