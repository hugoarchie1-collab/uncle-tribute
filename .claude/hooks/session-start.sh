#!/bin/bash
#
# SessionStart hook — runs once when a Claude Code session boots in this repo.
#
# Two jobs:
#   1. Install npm dependencies so build / lint / dev work immediately
#      (Vercel-style fresh checkout otherwise has no node_modules).
#   2. Print a one-line confirmation so the session log shows the
#      handoff doc is canonical and available.
#
# CLAUDE.md is auto-loaded by Claude Code as project context whenever it
# sits at the repo root — no explicit "load context" step is needed here.
#
# Set up by the session-start-hook skill. Safe to re-run (npm install is
# idempotent).

set -euo pipefail

# Web sessions start with a clean container. Local sessions already have
# node_modules — skip the install there to save time.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && [ ! -d node_modules ]; then
  npm install --no-audit --no-fund --prefer-offline >/dev/null 2>&1 || true
fi

echo "📖 CLAUDE.md auto-loaded as project context."
echo "    Run /read-context any time to re-read it + current data files."
