# Merge - Claude Code Agent Collaboration System

## Overview

Merge enables two Claude Code agents to collaborate via task delegation through a relay server. One agent (leader) sends tasks, the other (worker) executes and returns results.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start relay server (development)
pnpm dev:relay

# Link CLI globally (in packages/cli directory)
cd packages/cli && pnpm link --global
```

## Architecture

- **relay-server**: Express + WebSocket server that coordinates task exchange
- **cli**: Command-line tool for agents to send/receive tasks
- **shared-types**: TypeScript interfaces shared between packages
- **hooks**: Claude Code hooks for session awareness

## CLI Commands

### Connection
```bash
merge connect --token <token> --name "Agent Name"
merge disconnect
merge status
```

### Leader Commands (sending tasks)
```bash
merge send "Task description" --blocking      # Wait for result
merge send "Task description" --non-blocking  # Don't wait
merge task <id>                               # Check task status
merge tasks                                   # List all tasks
```

### Worker Commands (receiving tasks)
```bash
merge poll                                    # Check for pending tasks
merge accept <id>                             # Accept a task
merge result <id> --success --output "Done"   # Submit success result
merge result <id> --failure --error "Failed"  # Submit failure result
```

## Workflow Example

**Leader agent:**
```bash
merge connect --token secret --name "Leader"
merge send "Review the auth.ts file for security issues" --blocking
# Waits for worker to complete...
# Receives result JSON with output
```

**Worker agent:**
```bash
merge connect --token secret --name "Worker"
merge poll
# Shows pending tasks
merge accept abc123
# Do the work...
merge result abc123 --success --output "Found 2 issues: ..."
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

- `POST /api/v1/auth/connect` - Connect as agent
- `POST /api/v1/auth/disconnect` - Disconnect
- `GET /api/v1/auth/status` - Get status
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks` - List tasks
- `GET /api/v1/tasks/pending` - Get pending tasks
- `GET /api/v1/tasks/:id` - Get task details
- `PATCH /api/v1/tasks/:id/accept` - Accept task
- `PATCH /api/v1/tasks/:id/result` - Submit result
- `WS /ws?token=<token>&agentId=<id>` - WebSocket connection
