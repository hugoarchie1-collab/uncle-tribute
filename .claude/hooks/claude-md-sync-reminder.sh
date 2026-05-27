#!/bin/bash
#
# PostToolUse hook — runs after every Edit / Write / NotebookEdit.
#
# Reads the JSON payload from stdin, checks whether the edited file is
# one of the "architectural" files whose changes ought to be reflected
# in CLAUDE.md, and if so prints a reminder back to Claude.
#
# Hook stdout is shown to the model as additional context — perfect for
# a nudge that doesn't block work. The script always exits 0; this is
# purely advisory.
#
# Files we consider architectural (changes here typically warrant a
# CLAUDE.md update):
#   * api/                         Stripe integration / serverless funcs
#   * src/data/                    Painting / content source of truth
#   * src/App.tsx                  Routes
#   * src/components/{Nav,Footer,VideoIntro,EnquireModal}.tsx
#   * src/pages/Welcome.tsx        Home page section order
#   * vercel.json                  Deployment config
#   * package.json                 Dependency changes
#   * tailwind.config.ts           Brand palette / type scale
#   * .env / env-var schema        Stripe + Web3Forms keys

set -euo pipefail

# Read the tool-use payload Claude Code pipes to us
payload="$(cat)"

# Extract the file path the tool just wrote / edited. Different tools
# use different field names, so try the common ones in order.
file_path="$(
  printf '%s' "$payload" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]+"' \
    | head -1 | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/'
)"

if [ -z "$file_path" ]; then
  exit 0
fi

# Normalise to a repo-relative path
rel_path="${file_path#${CLAUDE_PROJECT_DIR:-}/}"

case "$rel_path" in
  api/*                              | \
  src/data/*                         | \
  src/App.tsx                        | \
  src/pages/Welcome.tsx              | \
  src/components/Nav.tsx             | \
  src/components/Footer.tsx          | \
  src/components/VideoIntro.tsx      | \
  src/components/EnquireModal.tsx    | \
  vercel.json                        | \
  package.json                       | \
  tailwind.config.ts                 )
    cat <<EOF
🔁 You just edited \`$rel_path\` — an architectural file.

If this change affects any of the following in CLAUDE.md, update the
relevant section in the SAME commit / PR so the source-of-truth doc
stays accurate:

  • api/*               → "Stripe print sales — architecture" section
  • src/data/*          → "Data files (single source of truth)" section
  • src/App.tsx         → "Routes" table
  • src/pages/Welcome.tsx → "Welcome page sections (in scroll order)"
  • src/components/*    → "Components" table
  • vercel.json         → "Required Vercel env vars" / rewrite gotcha
  • package.json        → "Tech stack" table
  • tailwind.config.ts  → "Brand & design system" section

If the change is cosmetic / a bug fix that doesn't change architecture,
ignore this reminder.
EOF
    ;;
  *)
    # Not architectural — no nudge
    ;;
esac

exit 0
