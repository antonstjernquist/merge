# Merge - Claude Code Agent Collaboration System

## Overview

Merge enables two Claude Code agents to collaborate via task delegation through a relay server. One agent (leader) sends tasks, the other (worker) executes and returns results.

## Quick Start

### Install CLI

```bash
curl -fsSL https://cdn.kresis.ai/merge/install.sh | bash
```

### Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start relay server (development)
pnpm dev:relay
```

## Architecture

- **relay-server**: Express + WebSocket server that coordinates task exchange
- **cli**: Command-line tool for agents to send/receive tasks
- **shared-types**: TypeScript interfaces shared between packages
- **hooks**: Claude Code hooks for session awareness

## CLI Commands

### Connection
```bash
agent-merge connect --token <token> --name "Agent Name" --room <room>
agent-merge disconnect
agent-merge status
```

### Real-time Communication
```bash
agent-merge listen                      # Listen for real-time events via WebSocket
agent-merge listen --room "project-x"   # Listen in a specific room
agent-merge listen --json               # Output raw JSON messages
agent-merge listen --types "room_task,task_completed"  # Filter event types
```

### Daemon Mode (AI Task Execution)
```bash
agent-merge daemon                      # Run as daemon, manually accept tasks
agent-merge daemon --auto-accept        # Auto-accept and execute tasks via Claude Code SDK
agent-merge daemon --room "project-x"   # Join a specific room
agent-merge daemon --cwd /path/to/work  # Set working directory for task execution
agent-merge daemon --verbose            # Enable verbose logging
```

### Leader Commands (sending tasks)
```bash
agent-merge send "Task description" --blocking      # Wait for result
agent-merge send "Task description" --non-blocking  # Don't wait
agent-merge task <id>                               # Check task status
agent-merge tasks                                   # List all tasks
```

### Worker Commands (receiving tasks)
```bash
agent-merge poll                                    # Check for pending tasks
agent-merge accept <id>                             # Accept a task
agent-merge result <id> --success --output "Done"   # Submit success result
agent-merge result <id> --failure --error "Failed"  # Submit failure result
```

## Workflow Example

**Leader agent:**
```bash
agent-merge connect --token secret --name "Leader"
agent-merge send "Review the auth.ts file for security issues" --blocking
# Waits for worker to complete...
# Receives result JSON with output
```

**Worker agent:**
```bash
agent-merge connect --token secret --name "Worker"
agent-merge poll
# Shows pending tasks
agent-merge accept abc123
# Do the work...
agent-merge result abc123 --success --output "Found 2 issues: ..."
```

## Development

```bash
# Run relay server in dev mode (auto-reload)
pnpm dev:relay

# Build specific package
pnpm --filter @merge/cli build

# Build all
pnpm build
```

## Configuration

CLI config is stored at `~/.merge/config.yaml`:
```yaml
serverUrl: http://localhost:3000
wsUrl: ws://localhost:3000
token: your-token
agentId: uuid
agentName: Agent Name
defaultRoom: default
```

## Deployment

### Using GitHub Container Registry (recommended for VPS)

```bash
# Pull the latest image
docker pull ghcr.io/antonstjernquist/merge/relay-server:latest

# Run with environment variables
docker run -d \
  --name merge-relay \
  -p 3000:3000 \
  -e SHARED_TOKEN=your-secure-token \
  -e SESSION_TIMEOUT_MS=3600000 \
  --restart unless-stopped \
  ghcr.io/antonstjernquist/merge/relay-server:latest
```

### Using Docker Compose (local development)

```bash
docker-compose up -d
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SHARED_TOKEN` | `dev-token` | Authentication token for agents |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `SESSION_TIMEOUT_MS` | `3600000` | Session timeout (1 hour) |

## API Endpoints

### Authentication
- `POST /api/v1/auth/connect` - Connect as agent
- `POST /api/v1/auth/disconnect` - Disconnect
- `GET /api/v1/auth/status` - Get status

### Tasks
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks` - List tasks
- `GET /api/v1/tasks/pending` - Get pending tasks
- `GET /api/v1/tasks/:id` - Get task details
- `PATCH /api/v1/tasks/:id/accept` - Accept task
- `PATCH /api/v1/tasks/:id/result` - Submit result

### Rooms
- `GET /api/v1/rooms` - List all rooms
- `GET /api/v1/rooms/:roomId` - Get room with message history
- `POST /api/v1/rooms` - Create a new room
- `POST /api/v1/rooms/:roomId/join` - Join a room
- `POST /api/v1/rooms/:roomId/leave` - Leave a room
- `GET /api/v1/rooms/:roomId/messages` - Get room messages

### WebSocket
- `WS /ws?token=<token>&agentId=<id>&room=<room>` - WebSocket connection

#### WebSocket Events (Server -> Client)
- `room_joined` - Agent joined a room
- `room_left` - Agent left a room
- `room_message` - New message in room
- `room_task` - New task in room
- `task_created` - Task was created
- `task_assigned` - Task was assigned
- `task_updated` - Task status changed
- `task_completed` - Task completed
- `task_progress` - Task progress update

#### WebSocket Actions (Client -> Server)
- `join_room` - Join a room
- `leave_room` - Leave a room
- `send_message` - Send message to room
- `send_task` - Send task to room
- `task_progress` - Report task progress
- `task_result` - Submit task result
