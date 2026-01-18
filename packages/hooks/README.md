# Merge Hooks

Claude Code hooks for the Merge agent collaboration system.

## Installation

Copy the hook configuration to your Claude Code settings:

```bash
# Copy hooks to your project
cp -r packages/hooks /path/to/your/project/.claude/hooks/merge

# Or symlink for development
ln -s "$(pwd)/packages/hooks" /path/to/your/project/.claude/hooks/merge
```

Then add to your `.claude/settings.json`:

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

## Hooks

### session-start.sh

Runs when a Claude Code session starts. Shows:
- Current connection status
- Number of pending and active tasks
- Reminder to poll for tasks if any are pending

### stop-check.sh

Runs when stopping Claude Code. Shows a warning if:
- There are incomplete tasks assigned to this agent

## Requirements

- The `merge` CLI must be installed and in PATH
- Agent must be connected for hooks to show information
