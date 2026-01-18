# Merge Hooks

Claude Code hooks for the Merge agent collaboration system. These hooks provide context awareness by displaying merge status when sessions start and warning about incomplete tasks when stopping.

## Overview

Hooks in Claude Code are shell scripts that run at specific lifecycle events. The Merge hooks help agents stay aware of their collaboration status without interrupting the workflow.

**Important:** Hooks provide context awareness only - they cannot inject prompts into Claude sessions. The actual task management is done through the `merge` CLI.

## Available Hooks

### `session-start.sh`

Runs when a Claude Code session starts. Displays:
- Current connection status
- Agent name (if connected)
- Number of pending and active tasks
- Reminder to poll for tasks if any are pending

**Example output:**
```
[Merge] Connected as: Worker
[Merge] Pending tasks: 2, Active tasks: 0
[Merge] Run 'merge poll' to see pending tasks
```

### `stop-check.sh`

Runs when stopping Claude Code. Displays a warning if:
- There are incomplete tasks assigned to this agent

**Example output:**
```
[Merge Warning] You have 1 incomplete task(s)
[Merge Warning] Consider completing or submitting results before stopping
```

## Installation

### Option 1: Copy to Project

```bash
# Copy hooks to your project's .claude directory
mkdir -p /path/to/your/project/.claude/hooks/merge
cp packages/hooks/*.sh /path/to/your/project/.claude/hooks/merge/
chmod +x /path/to/your/project/.claude/hooks/merge/*.sh
```

### Option 2: Symlink (for Development)

```bash
# Create symlink to this directory
ln -s "$(pwd)/packages/hooks" /path/to/your/project/.claude/hooks/merge
```

### Option 3: Global Installation

```bash
# Copy to home directory
mkdir -p ~/.claude/hooks/merge
cp packages/hooks/*.sh ~/.claude/hooks/merge/
chmod +x ~/.claude/hooks/merge/*.sh
```

## Configuration

Add the hooks to your Claude Code settings (`.claude/settings.json` or `~/.claude/settings.json`):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "./.claude/hooks/merge/session-start.sh"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "./.claude/hooks/merge/stop-check.sh"
      }
    ]
  }
}
```

For global installation, use absolute paths:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "~/.claude/hooks/merge/session-start.sh"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "~/.claude/hooks/merge/stop-check.sh"
      }
    ]
  }
}
```

## Requirements

1. **merge CLI** must be installed and available in PATH
2. Agent must be connected for hooks to display information
3. Hooks must have execute permissions (`chmod +x *.sh`)

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code Session                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Session Start                                        │
│     └─► session-start.sh runs                           │
│         └─► Calls 'merge status'                        │
│             └─► Shows connection info & pending tasks   │
│                                                          │
│  2. During Session                                       │
│     └─► Agent uses 'merge' CLI directly                 │
│         - merge poll                                     │
│         - merge accept <id>                              │
│         - merge result <id> --success --output "..."    │
│                                                          │
│  3. Session Stop                                         │
│     └─► stop-check.sh runs                              │
│         └─► Calls 'merge status'                        │
│             └─► Warns if incomplete tasks exist         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Hooks not running

1. Check file permissions: `ls -la ~/.claude/hooks/merge/`
2. Ensure scripts are executable: `chmod +x *.sh`
3. Verify paths in settings.json are correct

### "merge: command not found"

1. Ensure the CLI is built: `cd packages/cli && pnpm build`
2. Link globally: `pnpm link --global`
3. Or add to PATH: `export PATH="$PATH:/path/to/merge/packages/cli/bin"`

### No output from hooks

Hooks only show output when:
- `session-start.sh`: Agent is connected
- `stop-check.sh`: Agent has incomplete tasks

If not connected, hooks exit silently.

## Customization

Feel free to modify the hooks for your workflow:

```bash
# Example: Add sound notification for pending tasks
if [ "$PENDING" -gt 0 ]; then
  echo "[Merge] Pending tasks: $PENDING"
  # macOS
  afplay /System/Library/Sounds/Glass.aiff &
  # Linux
  # paplay /usr/share/sounds/freedesktop/stereo/message.oga &
fi
```

## License

MIT
