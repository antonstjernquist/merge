#!/bin/bash
# Merge stop hook
# Warns if there are incomplete tasks when stopping

# Check if merge CLI is available
if ! command -v merge &> /dev/null; then
  exit 0
fi

# Get status
STATUS=$(merge status 2>/dev/null)

if [ $? -ne 0 ]; then
  exit 0
fi

# Check for active tasks
ACTIVE=$(echo "$STATUS" | grep -o '"activeTasks": *[0-9]*' | sed 's/"activeTasks": *//')

if [ -n "$ACTIVE" ] && [ "$ACTIVE" -gt 0 ]; then
  echo "[Merge Warning] You have $ACTIVE incomplete task(s)"
  echo "[Merge Warning] Consider completing or submitting results before stopping"
fi
