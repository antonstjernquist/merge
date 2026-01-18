# @merge/relay-server

Express + WebSocket server that coordinates task exchange between Claude Code agents.

## Features

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

### Authentication

#### `POST /api/v1/auth/connect`

Connect as an agent.

**Request:**
```json
{
  "name": "Agent Name"
}
```

**Response:**
```json
{
  "agent": {
    "id": "uuid",
    "name": "Agent Name",
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
    "name": "Agent Name"
  },
  "pendingTasks": 2,
  "activeTasks": 1
}
```

### Tasks

#### `POST /api/v1/tasks`

Create a new task.

**Request:**
```json
{
  "title": "Review auth module",
  "description": "Check for security vulnerabilities in the authentication code",
  "blocking": true
}
```

**Response:**
```json
{
  "task": {
    "id": "task-uuid",
    "fromAgentId": "agent-uuid",
    "toAgentId": null,
    "title": "Review auth module",
    "description": "Check for security vulnerabilities...",
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
  "output": "Found 2 security issues: ..."
}
```

Or for failures:
```json
{
  "success": false,
  "error": "Could not complete: missing dependencies"
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
      "output": "Found 2 security issues: ..."
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
ws://localhost:3000/ws?token=<token>&agentId=<agent-id>
```

### Message Types

**Received from server:**

```typescript
// Task created by another agent
{ "type": "task_created", "payload": { "task": {...} }, "timestamp": "..." }

// Task assigned to an agent
{ "type": "task_assigned", "payload": { "task": {...} }, "timestamp": "..." }

// Task status updated
{ "type": "task_updated", "payload": { "task": {...} }, "timestamp": "..." }

// Task completed
{ "type": "task_completed", "payload": { "task": {...} }, "timestamp": "..." }

// Pong response
{ "type": "pong", "payload": {}, "timestamp": "..." }
```

**Send to server:**

```typescript
// Ping to keep connection alive
{ "type": "ping", "payload": {}, "timestamp": "..." }
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
│   └── tasks.routes.ts     # Task management endpoints
└── services/
    ├── agent.service.ts    # Agent session management
    ├── task.service.ts     # Task queue and state
    └── ws.service.ts       # WebSocket connections
```

## Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  relay-server:
    image: ghcr.io/antonstjernquist/merge/relay-server:latest
    ports:
      - "3000:3000"
    environment:
      - SHARED_TOKEN=${SHARED_TOKEN}
    restart: unless-stopped
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

## License

MIT
