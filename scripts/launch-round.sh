#!/bin/bash
# launch-round.sh — Launch 5 Claude Code agents in parallel tmux panes
#
# Usage:
#   ./launch-round.sh round-3-specs
#   ./launch-round.sh round-4-specs
#
# What it does:
#   1. Reads each agent-*.md spec from the given directory
#   2. Extracts the branch name from line 2 (# Branch: feature/xxx)
#   3. Creates a git worktree at .claude/worktrees/round-N/<module>/
#   4. Copies the spec into the worktree as AGENT_SPEC.md
#   5. Opens a tmux session with one pane per agent, claude pre-loaded
#
# Prerequisites: tmux, claude CLI

set -euo pipefail

SPECS_DIR="${1:?Usage: ./launch-round.sh <specs-dir>  (e.g. round-3-specs)}"
BASE="$(git rev-parse --show-toplevel)"

# Derive round name from specs dir (round-3-specs -> round-3)
ROUND="$(basename "$SPECS_DIR" | sed 's/-specs$//')"
SESSION="vent-${ROUND}"
WT_BASE="$BASE/.claude/worktrees/$ROUND"

# Collect spec files
SPECS=("$SPECS_DIR"/agent-*.md)
if [ ${#SPECS[@]} -eq 0 ]; then
  echo "No agent-*.md files found in $SPECS_DIR"
  exit 1
fi

echo "=== Vent Build Launcher ==="
echo "Round:    $ROUND"
echo "Specs:    ${#SPECS[@]} agents"
echo "Session:  $SESSION"
echo ""

# Kill existing tmux session if present
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create worktrees and build launch commands
COMMANDS=()
for spec in "${SPECS[@]}"; do
  # Extract branch name from line 2: "# Branch: feature/xxx"
  BRANCH=$(sed -n '2s/^# Branch: *//p' "$spec")
  if [ -z "$BRANCH" ]; then
    echo "WARNING: No branch found in $spec (expected '# Branch: ...' on line 2), skipping"
    continue
  fi

  # Module name from branch (feature/capa-tracker -> capa-tracker)
  MODULE="${BRANCH#feature/}"
  WT_PATH="$WT_BASE/$MODULE"

  echo "  Agent: $MODULE -> $BRANCH"

  # Create worktree (skip if already exists)
  if [ -d "$WT_PATH" ]; then
    echo "    Worktree exists, reusing: $WT_PATH"
  else
    mkdir -p "$WT_BASE"
    git worktree add -b "$BRANCH" "$WT_PATH" HEAD 2>/dev/null || \
    git worktree add "$WT_PATH" "$BRANCH" 2>/dev/null || {
      echo "    ERROR: Could not create worktree for $BRANCH"
      continue
    }
  fi

  # Copy spec into worktree
  cp "$spec" "$WT_PATH/AGENT_SPEC.md"

  # Build the command for this pane
  COMMANDS+=("cd '$WT_PATH' && echo '=== $MODULE ($BRANCH) ===' && claude 'Read AGENT_SPEC.md and implement everything it describes. Follow the project conventions in CLAUDE.md.'")
done

if [ ${#COMMANDS[@]} -eq 0 ]; then
  echo "No agents to launch."
  exit 1
fi

echo ""
echo "Launching tmux session with ${#COMMANDS[@]} panes..."

# Create tmux session with first agent
tmux new-session -d -s "$SESSION" "${COMMANDS[0]}"

# Add remaining agents as split panes
for ((i = 1; i < ${#COMMANDS[@]}; i++)); do
  tmux split-window -t "$SESSION" "${COMMANDS[$i]}"
  tmux select-layout -t "$SESSION" tiled
done

echo ""
echo "Done! Attaching to session '$SESSION'..."
echo ""
echo "  tmux controls:"
echo "    Ctrl-b + arrow keys  — switch between panes"
echo "    Ctrl-b + z           — zoom into/out of a pane"
echo "    Ctrl-b + d           — detach (agents keep running)"
echo "    tmux attach -t $SESSION  — reattach later"
echo ""

tmux attach -t "$SESSION"
