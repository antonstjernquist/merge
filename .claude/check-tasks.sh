#!/bin/bash
# Check for pending merge tasks on user prompt submit

CONFIG_FILE="$HOME/.merge/mcp-config.yaml"
TOKEN="${MERGE_TOKEN:-8zZmhCXxysxq52kb4TYYxH7oVuOKkmqmRRzChcfoRGY=}"
SERVER="${MERGE_SERVER_URL:-https://relay.kresis.ai}"

# Get agent ID from config if exists
if [ -f "$CONFIG_FILE" ]; then
  AGENT_ID=$(grep 'agentId:' "$CONFIG_FILE" | awk '{print $2}')
fi

if [ -z "$AGENT_ID" ]; then
  exit 0
fi

# Check for pending tasks
RESPONSE=$(curl -s "$SERVER/api/v1/tasks/pending" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-Id: $AGENT_ID" 2>/dev/null)

if [ $? -ne 0 ]; then
  exit 0
fi

# Parse task count
TASK_COUNT=$(echo "$RESPONSE" | grep -o '"tasks":\s*\[' | head -1)
if [ -z "$TASK_COUNT" ]; then
  exit 0
fi

# Count tasks using jq if available, otherwise basic grep
if command -v jq &> /dev/null; then
  COUNT=$(echo "$RESPONSE" | jq '.tasks | length' 2>/dev/null)
  if [ "$COUNT" -gt 0 ]; then
    TITLES=$(echo "$RESPONSE" | jq -r '.tasks[].title' 2>/dev/null | head -3)
    echo "[Merge] $COUNT pending task(s):"
    echo "$TITLES" | while read -r title; do
      echo "  - $title"
    done
    echo "[Merge] Use merge_check_tasks and merge_accept_task to handle them."
  fi
else
  # Fallback without jq
  COUNT=$(echo "$RESPONSE" | grep -o '"id":' | wc -l | tr -d ' ')
  if [ "$COUNT" -gt 0 ]; then
    echo "[Merge] $COUNT pending task(s) available. Use merge_check_tasks to see them."
  fi
fi
