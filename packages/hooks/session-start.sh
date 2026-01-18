#!/bin/bash
# Merge session-start hook
# Shows current merge status when a Claude Code session starts

# Check if merge CLI is available
if ! command -v merge &> /dev/null; then
  exit 0
fi

# Get status
STATUS=$(merge status 2>/dev/null)

if [ $? -ne 0 ]; then
  exit 0
fi

# Check if connected
CONNECTED=$(echo "$STATUS" | grep -o '"connected": *true' || true)

if [ -n "$CONNECTED" ]; then
  AGENT_NAME=$(echo "$STATUS" | grep -o '"name": *"[^"]*"' | head -1 | sed 's/"name": *"\([^"]*\)"/\1/')
  PENDING=$(echo "$STATUS" | grep -o '"pendingTasks": *[0-9]*' | sed 's/"pendingTasks": *//')
  ACTIVE=$(echo "$STATUS" | grep -o '"activeTasks": *[0-9]*' | sed 's/"activeTasks": *//')

  echo "[Merge] Connected as: $AGENT_NAME"
  echo "[Merge] Pending tasks: $PENDING, Active tasks: $ACTIVE"

  if [ "$PENDING" -gt 0 ]; then
    echo "[Merge] Run 'merge poll' to see pending tasks"
  fi
fi
