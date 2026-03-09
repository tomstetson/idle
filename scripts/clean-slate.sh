#!/usr/bin/env bash
# clean-slate.sh — Kill all Idle and Claude sessions, log state first
#
# Captures a snapshot of every active session (PID, CWD, session ID) to
# ~/Downloads/killed-sessions-<timestamp>.md, then terminates everything
# so you can reconnect fresh from your phone.
#
# Auth files (~/.idle/access.key) are preserved.
# Also cleans up legacy Happy daemon state if present (migration support).
#
# Usage:
#   ./scripts/clean-slate.sh            # interactive — prompts before kill
#   ./scripts/clean-slate.sh --force    # no prompt, just do it
#   ./scripts/clean-slate.sh --dry-run  # report only, kill nothing

set -uo pipefail
# Note: no -e — we handle errors explicitly since many commands return
# non-zero legitimately (pgrep with no matches, grep -q with no match, etc.)

# ── Config ──────────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
REPORT="$HOME/Downloads/killed-sessions-${TIMESTAMP}.md"
IDLE_STATE="$HOME/.idle/daemon.state.json"
HAPPY_STATE="$HOME/.happy/daemon.state.json"
DRY_RUN=false
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --force)   FORCE=true ;;
    --help|-h)
      echo "Usage: clean-slate.sh [--dry-run] [--force]"
      echo "  --dry-run  Report sessions without killing anything"
      echo "  --force    Skip confirmation prompt"
      exit 0
      ;;
  esac
done

# ── Helpers ─────────────────────────────────────────────────────────────
log() { echo "  $*"; }
header() { echo ""; echo "▸ $*"; }

get_cwd() {
  local result
  result=$(lsof -p "$1" 2>/dev/null | awk '/cwd/{print $NF}') || true
  echo "${result:-unknown}"
}

json_field() {
  # json_field <file> <field>
  python3 -c "import json; print(json.load(open('$1')).get('$2', ''))" 2>/dev/null || echo ""
}

# ── Detect daemons ──────────────────────────────────────────────────────
IDLE_PID=""
IDLE_START=""
HAPPY_PID=""
HAPPY_START=""

if [[ -f "$IDLE_STATE" ]]; then
  IDLE_PID=$(json_field "$IDLE_STATE" "pid")
  IDLE_START=$(json_field "$IDLE_STATE" "startTime")
fi

if [[ -f "$HAPPY_STATE" ]]; then
  HAPPY_PID=$(json_field "$HAPPY_STATE" "pid")
  HAPPY_START=$(json_field "$HAPPY_STATE" "startTime")
fi

# ── Detect current session ──────────────────────────────────────────────
IN_MANAGED_SESSION=false
if ps -p "$PPID" -o args= 2>/dev/null | grep -qE 'claude|idle-coder|happy-coder' 2>/dev/null; then
  IN_MANAGED_SESSION=true
fi

# ── Collect Claude processes by daemon ──────────────────────────────────
collect_claude_pids() {
  # Find all claude binary processes that are descendants of a given PID
  local daemon_pid=$1
  local pids=""

  # Get all claude/versions processes and check ancestry
  while IFS= read -r cpid; do
    [[ -z "$cpid" ]] && continue
    local walk_pid=$cpid
    local depth=0
    while [[ $depth -lt 15 ]]; do
      local parent
      parent=$(ps -p "$walk_pid" -o ppid= 2>/dev/null | tr -d ' ') || break
      [[ -z "$parent" || "$parent" == "0" || "$parent" == "1" ]] && break
      if [[ "$parent" == "$daemon_pid" ]]; then
        pids="$pids $cpid"
        break
      fi
      walk_pid=$parent
      ((depth++))
    done
  done < <(pgrep -f 'claude/versions' 2>/dev/null || true)

  echo "$pids" | tr ' ' '\n' | sort -un | grep -v '^$' || true
}

collect_orphan_claude_pids() {
  # Claude processes not under either daemon
  while IFS= read -r cpid; do
    [[ -z "$cpid" ]] && continue
    local walk_pid=$cpid
    local is_managed=false
    local depth=0
    while [[ $depth -lt 15 ]]; do
      local parent
      parent=$(ps -p "$walk_pid" -o ppid= 2>/dev/null | tr -d ' ') || break
      [[ -z "$parent" || "$parent" == "0" || "$parent" == "1" ]] && break
      if [[ -n "$IDLE_PID" && "$parent" == "$IDLE_PID" ]] || \
         [[ -n "$HAPPY_PID" && "$parent" == "$HAPPY_PID" ]]; then
        is_managed=true
        break
      fi
      walk_pid=$parent
      ((depth++))
    done
    if [[ "$is_managed" == false ]]; then
      echo "$cpid"
    fi
  done < <(pgrep -f 'claude/versions' 2>/dev/null || true)
}

# ── Build the report ───────────────────────────────────────────────────
{
  echo "# Killed Sessions Report"
  echo ""
  echo "**Date:** $(date '+%Y-%m-%d %H:%M:%S')"
  echo "**Host:** $(hostname)"
  echo ""

  # ── Idle daemon ──
  echo "## Idle Daemon"
  echo ""
  if [[ -n "$IDLE_PID" ]]; then
    echo "- **PID:** $IDLE_PID"
    echo "- **Started:** $IDLE_START"
    echo ""

    # Active sessions from state file
    SESSION_COUNT=$(python3 -c "
import json
with open('$IDLE_STATE') as f:
    data = json.load(f)
print(len(data.get('activeSessions', [])))
" 2>/dev/null || echo "0")

    echo "### Active Sessions ($SESSION_COUNT)"
    echo ""

    if [[ "$SESSION_COUNT" -gt 0 ]]; then
      echo "| # | Session ID | Working Directory | Started At |"
      echo "|---|-----------|-------------------|------------|"
      python3 -c "
import json
with open('$IDLE_STATE') as f:
    data = json.load(f)
for i, s in enumerate(data.get('activeSessions', []), 1):
    sid = s.get('idleSessionId', 'unknown')
    cwd = s.get('workingDirectory', 'unknown')
    started = s.get('startedAt', 'unknown')
    print(f'| {i} | \`{sid[:12]}...\` | \`{cwd}\` | {started} |')
" 2>/dev/null || echo "*(could not parse sessions)*"
      echo ""
    fi

    # Claude processes under idle daemon
    echo "### Claude Processes (under Idle)"
    echo ""
    echo "| PID | Working Directory |"
    echo "|-----|-------------------|"
    IDLE_CLAUDE_PIDS=$(collect_claude_pids "$IDLE_PID")
    if [[ -n "$IDLE_CLAUDE_PIDS" ]]; then
      while IFS= read -r cpid; do
        [[ -z "$cpid" ]] && continue
        cwd=$(get_cwd "$cpid")
        echo "| $cpid | \`$cwd\` |"
      done <<< "$IDLE_CLAUDE_PIDS"
    else
      echo "| — | *(none running)* |"
    fi
    echo ""
  else
    echo "*(no daemon state found)*"
    echo ""
  fi

  # ── Happy daemon ──
  echo "## Happy Daemon"
  echo ""
  if [[ -n "$HAPPY_PID" ]]; then
    echo "- **PID:** $HAPPY_PID"
    echo "- **Started:** $HAPPY_START"
    echo ""

    echo "### Claude Processes (under Happy)"
    echo ""
    echo "| PID | Working Directory |"
    echo "|-----|-------------------|"
    HAPPY_CLAUDE_PIDS=$(collect_claude_pids "$HAPPY_PID")
    if [[ -n "$HAPPY_CLAUDE_PIDS" ]]; then
      while IFS= read -r cpid; do
        [[ -z "$cpid" ]] && continue
        cwd=$(get_cwd "$cpid")
        echo "| $cpid | \`$cwd\` |"
      done <<< "$HAPPY_CLAUDE_PIDS"
    else
      echo "| — | *(none running)* |"
    fi
    echo ""
  else
    echo "*(no daemon state found)*"
    echo ""
  fi

  # ── Orphan Claude processes ──
  echo "## Orphan Claude Processes"
  echo ""
  echo "*(Claude processes not under Idle or Happy daemons)*"
  echo ""
  echo "| PID | Working Directory |"
  echo "|-----|-------------------|"
  ORPHAN_PIDS=$(collect_orphan_claude_pids)
  if [[ -n "$ORPHAN_PIDS" ]]; then
    while IFS= read -r cpid; do
      [[ -z "$cpid" ]] && continue
      cwd=$(get_cwd "$cpid")
      echo "| $cpid | \`$cwd\` |"
    done <<< "$ORPHAN_PIDS"
  else
    echo "| — | *(none found)* |"
  fi
  echo ""

  # ── Preserved files ──
  echo "## Preserved (not deleted)"
  echo ""
  echo "- \`~/.idle/access.key\`"
  echo "- \`~/.idle/settings.json\`"
  echo "- \`~/.happy/access.key\`"
  echo "- \`~/.happy/settings.json\`"
  echo "- \`~/.claude/\` (entire directory untouched)"
  echo ""
  echo "---"
  echo "*Generated by \`clean-slate.sh\`*"

} > "$REPORT"

header "Report saved to: $REPORT"

# ── Show summary ────────────────────────────────────────────────────────
header "Session summary"
grep -E '^\| [0-9]|^\- \*\*PID' "$REPORT" | head -20 || true

if $DRY_RUN; then
  echo ""
  echo "Dry run complete. No processes were killed."
  echo "  Report: $REPORT"
  exit 0
fi

# ── Confirmation ────────────────────────────────────────────────────────
if $IN_MANAGED_SESSION; then
  echo ""
  echo "WARNING: You are running this from within a Happy/Idle session."
  echo "  This script will kill the current session too."
  echo ""
fi

if ! $FORCE; then
  echo ""
  read -r -p "Kill all sessions and daemons? [y/N] " confirm
  if [[ "$confirm" != [yY] ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# ── Kill phase ──────────────────────────────────────────────────────────

kill_daemon() {
  local name=$1
  local pid=$2

  header "Killing $name daemon and children..."

  if [[ -z "$pid" ]]; then
    log "$name daemon PID unknown — skipping"
    return
  fi

  if ! ps -p "$pid" > /dev/null 2>&1; then
    log "$name daemon ($pid) not running"
    return
  fi

  # SIGTERM children first, then daemon
  pkill -TERM -P "$pid" 2>/dev/null || true
  sleep 1
  kill -TERM "$pid" 2>/dev/null || true
  sleep 1

  # SIGKILL anything still alive
  pkill -9 -P "$pid" 2>/dev/null || true
  kill -9 "$pid" 2>/dev/null || true

  log "$name daemon ($pid) terminated"
}

kill_daemon "Idle" "$IDLE_PID"
kill_daemon "Happy" "$HAPPY_PID"

header "Killing orphan Claude processes..."
ORPHAN_PIDS=$(pgrep -f 'claude/versions' 2>/dev/null || true)
if [[ -n "$ORPHAN_PIDS" ]]; then
  echo "$ORPHAN_PIDS" | xargs kill -TERM 2>/dev/null || true
  sleep 1
  STILL_ALIVE=$(pgrep -f 'claude/versions' 2>/dev/null || true)
  if [[ -n "$STILL_ALIVE" ]]; then
    echo "$STILL_ALIVE" | xargs kill -9 2>/dev/null || true
  fi
  log "Orphan claude processes cleaned up"
else
  log "No orphan claude processes"
fi

header "Killing stray caffeinate processes..."
pkill -f 'caffeinate -im' 2>/dev/null || true
log "Done"

# ── Cleanup state files (preserve auth) ────────────────────────────────
header "Cleaning up daemon state..."

if [[ -f "$IDLE_STATE" ]]; then
  echo '{}' > "$IDLE_STATE"
  log "Reset ~/.idle/daemon.state.json"
fi

if [[ -f "$HAPPY_STATE" ]]; then
  echo '{}' > "$HAPPY_STATE"
  log "Reset ~/.happy/daemon.state.json"
fi

rm -f "$HOME/.idle/daemon.state.json.lock" 2>/dev/null || true
rm -f "$HOME/.happy/daemon.state.json.lock" 2>/dev/null || true
log "Removed lock files"

# ── Verify ──────────────────────────────────────────────────────────────
header "Verification"

REMAINING=$(pgrep -cf 'claude/versions|idle-coder|happy-coder' 2>/dev/null || echo "0")
if [[ "$REMAINING" -eq 0 ]]; then
  log "All processes terminated successfully"
else
  log "WARNING: $REMAINING processes still running — may need manual cleanup"
  pgrep -fa 'claude/versions|idle-coder|happy-coder' 2>/dev/null | head -5 || true
fi

echo ""
echo "Clean slate complete. Report: $REPORT"
echo "Reconnect from your phone whenever you're ready."
