# Merge

**Claude Code Agent Collaboration System**

Merge enables multiple Claude Code agents to collaborate via task delegation through a relay server. Agents join rooms with API key protection, declare their roles and skills, and tasks are routed to the right agent.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Agent A        │    │  Agent B        │    │  Agent C        │
│  (Leader)       │    │  (Worker)       │    │  (Worker)       │
│  skills: []     │    │  skills:        │    │  skills:        │
│                 │    │   - testing     │    │   - review      │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │ Claude    │  │    │  │ Claude    │  │    │  │ Claude    │  │
│  │ Code      │  │    │  │ Code      │  │    │  │ Code      │  │
│  └─────┬─────┘  │    │  └─────┬─────┘  │    │  └─────┬─────┘  │
│  ┌─────▼─────┐  │    │  ┌─────▼─────┐  │    │  ┌─────▼─────┐  │
│  │ merge CLI │  │    │  │ merge CLI │  │    │  │ merge CLI │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │    ┌─────────────────┴──────────────────┐   │
         └───►│        Relay Server (VPS)          │◄──┘
              │   Rooms · Routing · WebSocket      │
              └────────────────────────────────────┘
```

## Features

- **Room-based isolation** - Agents join rooms protected by API keys
- **Agent roles** - Leader, worker, or both
- **Skills** - Agents declare capabilities for targeted routing
- **Targeted tasks** - Route to specific agent, by skill, or broadcast to all

## Packages

| Package | Description |
|---------|-------------|
| [@merge/relay-server](./packages/relay-server) | Express + WebSocket server for task coordination |
| [@merge/cli](./packages/cli) | Command-line tool for agents to send/receive tasks |
| [@merge/shared-types](./packages/shared-types) | TypeScript interfaces shared between packages |
| [hooks](./packages/hooks) | Claude Code hooks for session awareness |

## Quick Start

### 1. Deploy the Relay Server

```bash
# Using the pre-built Docker image (recommended)
docker run -d \
  --name merge-relay \
  -p 3000:3000 \
  -e SHARED_TOKEN=your-secure-token \
  --restart unless-stopped \
  ghcr.io/antonstjernquist/merge/relay-server:latest
```

### 2. Install the CLI

```bash
curl -fsSL https://cdn.kresis.ai/merge/install.sh | bash
```

<details>
<summary>Manual installation (from source)</summary>

```bash
# Clone and build
git clone https://github.com/antonstjernquist/merge.git
cd merge
pnpm install
pnpm build

# Link CLI globally
cd packages/cli
pnpm link --global
```

</details>

### 3. Join a Room

**Terminal 1 (Leader) - Creates and locks the room:**
```bash
merge join my-project \
  --key secret-room-key \
  --name "Leader" \
  --role leader \
  --server http://your-vps:3000
```

**Terminal 2 (Worker with testing skills):**
```bash
merge join my-project \
  --key secret-room-key \
  --name "Tester" \
  --role worker \
  --skills testing,qa \
  --server http://your-vps:3000
```

**Terminal 3 (Worker with review skills):**
```bash
merge join my-project \
  --key secret-room-key \
  --name "Reviewer" \
  --role worker \
  --skills review,security \
  --server http://your-vps:3000
```

### 4. Send Tasks

```bash
# Route to agent with specific skill
merge send "Run the test suite" --to-skill testing --blocking

# Route to specific agent by name
merge send "Check the auth module" --to Reviewer --blocking

# Broadcast to all workers
merge send "Update your dependencies" --broadcast

# List agents in the room
merge agents
```

## How It Works

1. **Agents join a room** with `merge join`, providing a room key (first agent locks the room)
2. **Leader** creates a task via `merge send` with optional targeting
3. **Relay server** routes the task based on target (skill, agent name, or broadcast)
4. **Worker** polls for tasks via `merge poll`, accepts one via `merge accept`
5. **Worker** completes the work and submits result via `merge result`
6. **Leader** receives the result (if `--blocking` was used, it waits automatically)

## CLI Commands

| Command | Description |
|---------|-------------|
| `merge join <room>` | Join a room with role, skills, and optional API key |
| `merge agents` | List agents in the current room |
| `merge send <title>` | Send a task with optional targeting |
| `merge poll` | Poll for pending tasks |
| `merge accept <id>` | Accept a task |
| `merge result <id>` | Submit task result |
| `merge status` | Show connection status |
| `merge connect` | Legacy: Connect without room features |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run relay server in development mode
pnpm dev:relay

# Run tests
pnpm test
```

## Configuration

### Relay Server Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SHARED_TOKEN` | `dev-token` | Authentication token for agents |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server bind address |
| `SESSION_TIMEOUT_MS` | `3600000` | Session timeout in milliseconds (1 hour) |

### CLI Configuration

The CLI stores configuration in `~/.merge/config.yaml`:

```yaml
serverUrl: http://localhost:3000
wsUrl: ws://localhost:3000
token: your-token
agentId: <auto-generated>
agentName: Agent Name
defaultRoom: my-project
roomKey: secret-room-key
role: worker
skills:
  - testing
  - review
```

## Security Considerations

- **Room API keys** - Each room can be locked with an API key; only agents with the correct key can join
- **SHARED_TOKEN** - Optional admin token for legacy connect flow
- Deploy the relay server behind HTTPS (use a reverse proxy like nginx/caddy)
- Room keys are stored as SHA-256 hashes on the server
- Task content is not encrypted in transit beyond TLS

## License

MIT
