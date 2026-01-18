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

// Room interface
export interface Room {
  id: string;
  name: string;
  createdAt: string;
  agentIds: string[];
}

// Room message interface
export interface RoomMessage {
  id: string;
  roomId: string;
  fromAgentId: string;
  toAgentId: string | null; // null = broadcast to room
  content: string;
  timestamp: string;
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
  | 'pong'
  // Room events
  | 'room_joined'
  | 'room_left'
  | 'room_message'
  | 'room_task'
  // Client-initiated actions
  | 'join_room'
  | 'leave_room'
  | 'send_message'
  | 'send_task'
  // Task streaming
  | 'task_progress'
  | 'task_result';

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

// Room event payloads
export interface RoomJoinedPayload {
  room: Room;
  agent: Pick<Agent, 'id' | 'name'>;
}

export interface RoomLeftPayload {
  roomId: string;
  agent: Pick<Agent, 'id' | 'name'>;
}

export interface RoomMessagePayload {
  message: RoomMessage;
}

export interface RoomTaskPayload {
  task: Task;
  roomId: string;
}

// Client action payloads
export interface JoinRoomPayload {
  roomId: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface SendMessagePayload {
  roomId: string;
  content: string;
  toAgentId?: string; // optional direct message
}

export interface SendTaskPayload {
  roomId: string;
  title: string;
  description: string;
  blocking?: boolean;
  toAgentId?: string;
}

// Task progress/result payloads
export interface TaskProgressPayload {
  taskId: string;
  content: string;
}

export interface TaskResultPayload {
  taskId: string;
  success: boolean;
  output?: string;
  error?: string;
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
  defaultRoom?: string;
}

// API Error response
export interface APIError {
  error: string;
  code?: string;
  details?: unknown;
}

// Room API types
export interface GetRoomsResponse {
  rooms: Room[];
}

export interface GetRoomResponse {
  room: Room;
  messages: RoomMessage[];
}

export interface JoinRoomResponse {
  room: Room;
}

export interface CreateRoomRequest {
  name: string;
}

export interface CreateRoomResponse {
  room: Room;
}
