#!/usr/bin/env node
/*
 * 🔒 HOME PAGE FREEZE GUARD  (Hugo, 2026-08-23)
 * -------------------------------------------------------------------------
 * Blocks ANY edit to the frozen home-page files. This exists because the home
 * page was repeatedly "improved" by parallel sessions — each redesign made it
 * worse and reverted the last, which is what left Hugo feeling like quitting.
 * The home page is DONE. Do not touch it as a side effect of other work.
 *
 * Locked files:
 *   - src/pages/Welcome.tsx           (the home page + rebuilt masthead)
 *   - src/components/AmbientBackground.tsx  (the locked mesh-gradient bg)
 *
 * Deliberate unlock (only when Hugo EXPLICITLY asks for a home-page change):
 *   touch .claude/HOME_UNLOCKED   # make the change, verify, then:
 *   rm .claude/HOME_UNLOCKED
 * -------------------------------------------------------------------------
 */
let s = "";
process.stdin.on("data", (d) => (s += d));
process.stdin.on("end", () => {
  let f = "";
  try {
    const j = JSON.parse(s || "{}");
    f = (j.tool_input && (j.tool_input.file_path || j.tool_input.notebook_path)) || "";
  } catch (_) {}
  const fs = require("fs");
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  // Escape hatch: an unlocked marker lets a deliberate, Hugo-approved edit through.
  try {
    if (fs.existsSync(root + "/.claude/HOME_UNLOCKED")) return process.exit(0);
  } catch (_) {}
  if (/\/(src\/pages\/Welcome\.tsx|src\/components\/AmbientBackground\.tsx)$/.test(f)) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "🔒 HOME PAGE FROZEN (Hugo, 2026-08-23). " +
            f.replace(root + "/", "") +
            " is locked to stop the redesign-churn that kept reverting the home page. " +
            "Do NOT edit it unless Hugo EXPLICITLY asks for a home-page change. To unlock for that task: " +
            "run `touch .claude/HOME_UNLOCKED`, make the change, verify, then `rm .claude/HOME_UNLOCKED`. " +
            "See memory: project_home_page_frozen.",
        },
      })
    );
  }
  process.exit(0);
});
