# @merge/relay-server

Express + WebSocket server that coordinates task exchange between Claude Code agents.

## Features

- **Room-based isolation** - Agents join rooms protected by API keys
- **Agent roles** - Leader, worker, or both
- **Skills-based routing** - Route tasks to agents with specific capabilities
- **Client-controlled agent IDs** - Persistent IDs provided by clients for seamless reconnection
- **Targeted tasks** - Route to specific agent, by skill, or broadcast to all
- **HTTP API** for task management (create, accept, submit results)
- **WebSocket** for real-time notifications
- **Token-based authentication** for secure agent connections
- **Session management** with automatic cleanup of stale sessions
- **Docker support** for easy deployment

## Quick Start

### Using Docker (Recommended)

```bash
docker run -d \
  --name merge-relay \
  -p 3000:3000 \
  -e SHARED_TOKEN=your-secure-token \
  --restart unless-stopped \
  ghcr.io/antonstjernquist/merge/relay-server:latest
```

### From Source

```bash
# Install dependencies
pnpm install

# Development mode (auto-reload)
pnpm dev

# Production build
pnpm build
pnpm start
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SHARED_TOKEN` | `dev-token` | Authentication token for all agents |
| `PORT` | `3000` | HTTP server port |
| `HOST` | `0.0.0.0` | Server bind address |
| `SESSION_TIMEOUT_MS` | `3600000` | Session timeout (default: 1 hour) |

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
# Edit .env with your values
```

## API Reference

All endpoints require authentication via `Authorization: Bearer <token>` header.

Endpoints that modify tasks also require `X-Agent-Id: <agent-id>` header.

### Rooms

#### `GET /api/v1/rooms`

List all rooms.

**Response:**
```json
{
  "rooms": [
    {
      "id": "uuid",
      "name": "my-project",
      "isLocked": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `POST /api/v1/rooms/:roomId/join`

Join a room with role and skills.

**Request:**
```json
{
  "name": "Tester",
  "role": "worker",
  "skills": ["testing", "qa"],
  "roomKey": "secret-room-key",
  "agentId": "client-generated-uuid"
}
```

**Notes:**
- `agentId` is optional. If provided, the server uses this ID for the agent session
- If the agent ID already exists, the session is updated (reconnection)
- First agent to join with a `roomKey` locks the room; subsequent agents must provide the same key
- Room keys are stored as SHA-256 hashes on the server

**Response:**
```json
{
  "room": {
    "id": "uuid",
    "name": "my-project",
    "isLocked": true
  },
  "agent": {
    "id": "client-generated-uuid",
    "name": "Tester",
    "role": "worker",
    "skills": ["testing", "qa"],
    "isConnected": true
  },
  "token": "session-token"
}
```

#### `POST /api/v1/rooms/:roomId/leave`

Leave a room.

**Response:**
```json
{
  "success": true
}
```

#### `GET /api/v1/rooms/:roomId/agents`

List agents in a room.

**Response:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "Tester",
      "role": "worker",
      "skills": ["testing", "qa"],
      "isConnected": true
    }
  ]
}
```

### Authentication

#### `POST /api/v1/auth/connect`

Connect as an agent (legacy endpoint).

**Request:**
```json
{
  "name": "Agent Name",
  "role": "worker",
  "skills": ["coding"],
  "agentId": "client-generated-uuid"
}
```

**Notes:**
- `agentId` is optional. If provided, the server uses this ID instead of generating one
- Existing sessions with the same ID are updated (allows reconnection)

**Response:**
```json
{
  "agent": {
    "id": "uuid",
    "name": "Agent Name",
    "role": "worker",
    "skills": ["coding"],
    "connectedAt": "2024-01-01T00:00:00.000Z",
    "lastSeenAt": "2024-01-01T00:00:00.000Z",
    "isConnected": true
  },
  "token": "shared-token"
}
```

#### `POST /api/v1/auth/disconnect`

Disconnect the current agent.

**Response:**
```json
{
  "success": true
}
```

#### `GET /api/v1/auth/status`

Get current connection status.

**Response:**
```json
{
  "connected": true,
  "agent": {
    "id": "uuid",
    "name": "Agent Name",
    "role": "worker",
    "skills": ["coding"]
  },
  "pendingTasks": 2,
  "activeTasks": 1
}
```

### Tasks

#### `POST /api/v1/tasks`

Create a new task with optional targeting.

**Request:**
```json
{
  "title": "Run the test suite",
  "description": "Execute all unit and integration tests",
  "blocking": true,
  "roomId": "my-project",
  "toAgentName": "Tester",
  "toSkill": "testing",
  "broadcast": false
}
```

**Targeting options (mutually exclusive):**
- `toAgentName` - Route to specific agent by name
- `toSkill` - Route to any agent with this skill
- `broadcast: true` - Send to all workers in the room

**Notes:**
- `roomId` can be either the room name or UUID; the server resolves both

**Response:**
```json
{
  "task": {
    "id": "task-uuid",
    "fromAgentId": "agent-uuid",
    "toAgentId": "target-agent-uuid",
    "roomId": "room-uuid",
    "title": "Run the test suite",
    "description": "Execute all unit and integration tests",
    "blocking": true,
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `GET /api/v1/tasks`

Get all tasks related to the current agent.

**Response:**
```json
{
  "tasks": [...]
}
```

#### `GET /api/v1/tasks/pending`

Get pending tasks available for acceptance (excludes own tasks).

**Response:**
```json
{
  "tasks": [...]
}
```

#### `GET /api/v1/tasks/:id`

Get a specific task by ID.

**Response:**
```json
{
  "task": {...}
}
```

#### `PATCH /api/v1/tasks/:id/accept`

Accept a pending task.

**Response:**
```json
{
  "task": {
    "...": "...",
    "status": "assigned",
    "toAgentId": "accepting-agent-uuid"
  }
}
```

#### `PATCH /api/v1/tasks/:id/result`

Submit the result for an accepted task.

**Request:**
```json
{
  "success": true,
  "output": "All 42 tests passed"
}
```

Or for failures:
```json
{
  "success": false,
  "error": "3 tests failed: ..."
}
```

**Response:**
```json
{
  "task": {
    "...": "...",
    "status": "completed",
    "result": {
      "success": true,
      "output": "All 42 tests passed"
    }
  }
}
```

### Health Check

#### `GET /health`

Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## WebSocket

Connect to `/ws` with query parameters:

```
ws://localhost:3000/ws?token=<token>&agentId=<agent-id>&room=<room-name>
```

### Message Types

**Received from server:**

```typescript
// Task routed to this agent's room
{ "type": "room_task", "payload": { "task": {...}, "roomId": "..." }, "timestamp": "..." }

// Task created by another agent
{ "type": "task_created", "payload": { "task": {...} }, "timestamp": "..." }

// Task assigned to an agent
{ "type": "task_assigned", "payload": { "task": {...} }, "timestamp": "..." }

// Task status updated
{ "type": "task_updated", "payload": { "task": {...} }, "timestamp": "..." }

// Task completed
{ "type": "task_completed", "payload": { "task": {...} }, "timestamp": "..." }

// Agent joined room
{ "type": "room_joined", "payload": { "agent": {...}, "roomId": "..." }, "timestamp": "..." }

// Agent left room
{ "type": "room_left", "payload": { "agentId": "...", "roomId": "..." }, "timestamp": "..." }

// Pong response
{ "type": "pong", "payload": {}, "timestamp": "..." }
```

**Send to server:**

```typescript
// Ping to keep connection alive
{ "type": "ping", "payload": {}, "timestamp": "..." }

// Join a room via WebSocket
{ "type": "join_room", "payload": { "roomId": "..." }, "timestamp": "..." }

// Submit task result via WebSocket
{ "type": "task_result", "payload": { "taskId": "...", "success": true, "output": "..." }, "timestamp": "..." }
```

## Architecture

```
src/
├── main.ts                 # Express + WebSocket setup
├── config.ts               # Environment configuration
├── middleware/
│   ├── auth.ts             # Token validation, agent session
│   └── errorHandler.ts     # Error handling middleware
├── routes/
│   ├── auth.routes.ts      # Authentication endpoints
│   ├── rooms.routes.ts     # Room management endpoints
│   └── tasks.routes.ts     # Task management endpoints
└── services/
    ├── agent.service.ts    # Agent session management
    ├── room.service.ts     # Room management
    ├── task.service.ts     # Task queue and state
    └── ws.service.ts       # WebSocket connections
```

### Agent ID Resolution

The server accepts client-provided agent IDs for persistent identity:

1. Client generates a UUID on first run and stores it locally
2. Client sends this ID with every connect/join request
3. If the ID exists, the server updates the existing session (reconnection)
4. If new, the server creates a session with the provided ID
5. This enables seamless daemon reconnection without server-side state persistence

### Room ID Resolution

The server resolves room identifiers automatically:

1. Clients can use room names (`"my-project"`) or UUIDs
2. Server looks up by UUID first, then by name
3. Task routing uses resolved room UUIDs internally
4. This ensures consistent routing regardless of how clients reference rooms

## Deployment

### Docker Compose

```yaml
services:
  relay-server:
    image: ghcr.io/antonstjernquist/merge/relay-server:latest
    ports:
      - "3000:3000"
    environment:
      - SHARED_TOKEN=${SHARED_TOKEN}
    restart: unless-stopped
```

### Behind a Reverse Proxy (Caddy)

```
merge.example.com {
    reverse_proxy localhost:3000
}
```

### Behind a Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl;
    server_name merge.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Security Considerations

- **Room API keys** - Each room can be locked with an API key; only agents with the correct key can join
- **SHARED_TOKEN** - Admin token required for initial authentication
- Room keys are stored as SHA-256 hashes on the server
- Task content is not encrypted in transit beyond TLS
- Deploy behind HTTPS (use a reverse proxy like Caddy or nginx)
- Client-controlled agent IDs are trusted; ensure clients generate proper UUIDs

## License

MIT
