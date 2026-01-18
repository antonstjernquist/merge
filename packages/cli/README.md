# @merge/cli

Command-line tool for Claude Code agents to collaborate via the Merge relay server.

## Installation

### Quick Install

```bash
curl -fsSL https://cdn.kresis.ai/merge/install.sh | bash
```

### From Source

```bash
git clone https://github.com/antonstjernquist/merge.git
cd merge
pnpm install
pnpm build
cd packages/cli
pnpm link --global
```

## Quick Start

```bash
# Join a room as a worker
merge join my-project \
  --name "Worker" \
  --role worker \
  --skills coding,testing \
  --server http://your-vps:3000 \
  --token your-token

# Or run as auto-executing daemon
merge daemon \
  --name "Worker" \
  --server http://your-vps:3000 \
  --token your-token \
  --auto-accept
```

## Commands

### Room Management

#### `merge join <room>`

Join a room with role and skills.

```bash
merge join <room> --name <name> [options]
```

**Options:**
- `--name <name>` (required) - Agent display name
- `--role <role>` - `leader`, `worker`, or `both` (default: worker)
- `--skills <skills>` - Comma-separated skills
- `--server <url>` - Server URL
- `--token <token>` - Authentication token
- `--key <key>` - Room API key (locks room on first join)

**Example:**
```bash
merge join my-project \
  --name "Tester" \
  --role worker \
  --skills testing,qa \
  --server https://merge.example.com \
  --token secret123
```

#### `merge agents`

List agents in the current room.

```bash
merge agents
```

**Output:**
```json
{
  "success": true,
  "room": "my-project",
  "agents": [
    { "id": "uuid", "name": "Tester", "role": "worker", "skills": ["testing", "qa"], "isConnected": true }
  ]
}
```

### Daemon Mode

#### `merge daemon`

Run as a daemon that auto-accepts and executes tasks via Claude Code CLI.

```bash
merge daemon [options]
```

**Options:**
- `--name <name>` - Agent name (required on first run)
- `--room <room>` - Room to join (default: "default")
- `--role <role>` - Agent role (default: worker)
- `--skills <skills>` - Comma-separated skills
- `--server <url>` - Server URL
- `--token <token>` - Authentication token
- `--cwd <dir>` - Working directory for task execution
- `--auto-accept` - Automatically accept and execute incoming tasks
- `--verbose` - Enable verbose logging

**Features:**
- Self-registers on startup (no prior `join` needed)
- Uses persistent client-controlled agent ID
- Auto-reconnects on disconnect
- Executes tasks via `claude` CLI if available

**Example:**
```bash
# First run - provide all options
merge daemon \
  --name "Worker" \
  --server http://your-vps:3000 \
  --token your-token \
  --room my-project \
  --skills coding,testing \
  --auto-accept \
  --verbose

# Subsequent runs - config is persisted
merge daemon --auto-accept
```

### Task Sending (Leader)

#### `merge send <title>`

Send a task with optional targeting.

```bash
merge send "<title>" [options]
```

**Targeting Options:**
- `--to <agent>` - Route to specific agent by name
- `--to-skill <skill>` - Route to agent with specific skill
- `--broadcast` - Send to all workers in the room
- `--room <room>` - Target room (defaults to current)

**Other Options:**
- `--description <desc>` - Detailed description
- `--blocking` - Wait for completion (default)
- `--non-blocking` - Return immediately
- `--timeout <seconds>` - Timeout in seconds (default: 300)

**Examples:**
```bash
# Route to agent with specific skill
merge send "Run the test suite" --to-skill testing --blocking

# Route to specific agent by name
merge send "Review auth module" --to Reviewer --blocking

# Broadcast to all workers
merge send "Update dependencies" --broadcast
```

### Task Execution (Worker)

#### `merge poll`

Check for pending tasks.

```bash
merge poll
```

#### `merge accept <taskId>`

Accept a pending task.

```bash
merge accept <taskId>
```

#### `merge result <taskId>`

Submit task result.

```bash
merge result <taskId> --success --output "Done"
merge result <taskId> --failure --error "Failed"
```

### Utility Commands

#### `merge status`

Show connection status.

```bash
merge status
```

#### `merge task <taskId>`

Get task details.

```bash
merge task <taskId>
```

#### `merge tasks`

List all tasks.

```bash
merge tasks [--status <status>]
```

#### `merge listen`

Listen for real-time WebSocket events.

```bash
merge listen [--room <room>] [--json] [--types <types>]
```

#### `merge connect` (Legacy)

Connect without room features.

```bash
merge connect --token <token> --name <name> [--server <url>]
```

## Configuration

Configuration is stored in `~/.merge/config.yaml`:

```yaml
serverUrl: http://localhost:3000
wsUrl: ws://localhost:3000
token: your-token
agentId: <persistent-uuid>  # Auto-generated, never changes
agentName: Agent Name
defaultRoom: my-project
role: worker
skills:
  - coding
  - testing
```

### Persistent Agent ID

The CLI generates a unique agent ID on first run and persists it. This ID is client-controlled and survives:
- CLI restarts
- Server restarts
- Reconnections

This ensures seamless reconnection without server-side state management.

## Output Format

All commands output JSON to stdout. Errors go to stderr.

```json
{
  "success": true,
  "message": "..."
}
```

## Exit Codes

- `0` - Success
- `1` - Error

## License

MIT
