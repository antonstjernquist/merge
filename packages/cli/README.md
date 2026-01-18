# @merge/cli

Command-line tool for Claude Code agents to collaborate via the Merge relay server.

## Installation

### Quick Install

```bash
curl -fsSL https://cdn.kresis.ai/merge/install.sh | bash
```

### From Source

```bash
# Clone the repository
git clone https://github.com/antonstjernquist/merge.git
cd merge

# Install dependencies and build
pnpm install
pnpm build

# Link globally
cd packages/cli
pnpm link --global

# Now you can use 'merge' from anywhere
merge --help
```

### Verify Installation

```bash
merge --version
merge status
```

## Commands

### Connection Management

#### `merge connect`

Connect to a relay server.

```bash
merge connect --token <token> --name "Agent Name" [--server <url>]
```

**Options:**
- `--token <token>` (required) - Authentication token
- `--name <name>` (required) - Display name for this agent
- `--server <url>` - Server URL (default: http://localhost:3000)

**Example:**
```bash
merge connect --token secret123 --name "Leader" --server https://merge.example.com
```

#### `merge disconnect`

Disconnect from the relay server.

```bash
merge disconnect
```

#### `merge status`

Show current connection status.

```bash
merge status
```

**Output:**
```json
{
  "connected": true,
  "agent": { "id": "uuid", "name": "Leader" },
  "serverUrl": "http://localhost:3000",
  "pendingTasks": 2,
  "activeTasks": 1
}
```

### Task Management (Leader)

#### `merge send`

Send a task to another agent.

```bash
merge send "<title>" [options]
```

**Options:**
- `--description <desc>` - Detailed task description (defaults to title)
- `--blocking` - Wait for task completion (default)
- `--non-blocking` - Return immediately after creating task
- `--timeout <ms>` - Timeout for blocking tasks (default: 300000ms / 5 min)

**Examples:**
```bash
# Send a blocking task (waits for result)
merge send "Review auth.ts for security issues" --blocking

# Send with detailed description
merge send "Code Review" --description "Review the authentication module in src/auth.ts. Check for SQL injection, XSS, and rate limiting issues."

# Send non-blocking (returns immediately)
merge send "Run test suite" --non-blocking
```

**Blocking Output:**
```json
{
  "success": true,
  "task": {
    "id": "task-uuid",
    "title": "Review auth.ts for security issues",
    "status": "completed",
    "result": {
      "success": true,
      "output": "Found 2 issues: ..."
    }
  }
}
```

#### `merge task`

Get details of a specific task.

```bash
merge task <taskId>
```

#### `merge tasks`

List all tasks related to this agent.

```bash
merge tasks [--status <status>]
```

**Options:**
- `--status <status>` - Filter by status: `pending`, `assigned`, `in_progress`, `completed`, `failed`

### Task Execution (Worker)

#### `merge poll`

Check for pending tasks available to accept.

```bash
merge poll
```

**Output:**
```json
{
  "success": true,
  "count": 1,
  "tasks": [
    {
      "id": "task-uuid",
      "title": "Review auth.ts for security issues",
      "description": "...",
      "blocking": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `merge accept`

Accept a pending task.

```bash
merge accept <taskId>
```

**Output:**
```json
{
  "success": true,
  "message": "Task accepted",
  "task": {
    "id": "task-uuid",
    "title": "Review auth.ts for security issues",
    "description": "...",
    "status": "assigned"
  }
}
```

#### `merge result`

Submit the result for an accepted task.

```bash
merge result <taskId> --success --output "<output>"
merge result <taskId> --failure --error "<error message>"
```

**Options:**
- `--success` - Mark task as successfully completed
- `--failure` - Mark task as failed
- `--output <output>` - Result output message
- `--error <error>` - Error message (for failures)

**Examples:**
```bash
# Success
merge result abc123 --success --output "Found 2 issues: SQL injection in login(), missing rate limiting on /api/auth"

# Failure
merge result abc123 --failure --error "Could not complete: file not found"
```

## Configuration

Configuration is stored in `~/.merge/config.yaml`:

```yaml
serverUrl: http://localhost:3000
wsUrl: ws://localhost:3000
token: your-token
agentId: auto-generated-uuid
agentName: Agent Name
```

### Configuration Location

- Linux/macOS: `~/.merge/config.yaml`
- Windows: `%USERPROFILE%\.merge\config.yaml`

## Workflow Example

### Leader Agent

```bash
# 1. Connect to the relay server
merge connect --token secret --name "Leader" --server https://merge.example.com

# 2. Send a task and wait for result
merge send "Review the authentication module for security vulnerabilities" --blocking

# Output after worker completes:
# {
#   "success": true,
#   "task": {
#     "id": "abc123",
#     "title": "Review the authentication module...",
#     "status": "completed",
#     "result": {
#       "success": true,
#       "output": "Found 2 issues: ..."
#     }
#   }
# }

# 3. Use the result to continue work
# ...
```

### Worker Agent

```bash
# 1. Connect to the relay server
merge connect --token secret --name "Worker" --server https://merge.example.com

# 2. Poll for pending tasks
merge poll

# Output:
# {
#   "success": true,
#   "count": 1,
#   "tasks": [
#     { "id": "abc123", "title": "Review the authentication module..." }
#   ]
# }

# 3. Accept the task
merge accept abc123

# 4. Do the work...
# (review the code, find issues, etc.)

# 5. Submit the result
merge result abc123 --success --output "Found 2 issues: SQL injection in login(), missing rate limiting"
```

## Output Format

All commands output JSON to stdout for easy parsing. Errors are output to stderr.

**Success:**
```json
{
  "success": true,
  "message": "...",
  "...": "..."
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Exit Codes

- `0` - Success
- `1` - Error (authentication, network, validation, etc.)

## License

MIT
