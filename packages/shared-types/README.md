# @merge/shared-types

TypeScript type definitions shared between Merge packages.

## Installation

```bash
pnpm add @merge/shared-types
```

## Usage

```typescript
import type { Task, Agent, TaskStatus, WSMessage } from '@merge/shared-types';

const task: Task = {
  id: 'abc123',
  fromAgentId: 'agent-1',
  toAgentId: 'agent-2',
  title: 'Review code',
  description: 'Review the auth module',
  blocking: true,
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

## Types

### Core Types

#### `Task`

Represents a task delegated between agents.

```typescript
interface Task {
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
```

#### `TaskStatus`

```typescript
type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
```

#### `TaskResult`

```typescript
interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
}
```

#### `Agent`

Represents a connected agent.

```typescript
interface Agent {
  id: string;
  name: string;
  token: string;
  connectedAt: string;
  lastSeenAt: string;
  isConnected: boolean;
}
```

### WebSocket Types

#### `WSMessage`

```typescript
interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: string;
}

type WSMessageType =
  | 'task_created'
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'agent_connected'
  | 'agent_disconnected'
  | 'ping'
  | 'pong';
```

### API Types

#### Request Types

```typescript
interface CreateTaskRequest {
  title: string;
  description: string;
  blocking?: boolean;
  toAgentId?: string;
}

interface SubmitResultRequest {
  success: boolean;
  output?: string;
  error?: string;
}

interface ConnectRequest {
  name: string;
}
```

#### Response Types

```typescript
interface CreateTaskResponse {
  task: Task;
}

interface GetTasksResponse {
  tasks: Task[];
}

interface AcceptTaskResponse {
  task: Task;
}

interface SubmitResultResponse {
  task: Task;
}

interface ConnectResponse {
  agent: Agent;
  token: string;
}

interface StatusResponse {
  connected: boolean;
  agent?: Pick<Agent, 'id' | 'name'>;
  pendingTasks: number;
  activeTasks: number;
}
```

#### Error Type

```typescript
interface APIError {
  error: string;
  code?: string;
  details?: unknown;
}
```

### CLI Types

#### `CLIConfig`

```typescript
interface CLIConfig {
  serverUrl: string;
  wsUrl: string;
  token?: string;
  agentId?: string;
  agentName?: string;
}
```

## Building

```bash
pnpm build
```

## License

MIT
