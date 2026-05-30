// =============================================================================
// BOOK OF MEMORIES — single source of truth for the /memories wall
// -----------------------------------------------------------------------------
// This file is the estate's moderated guestbook. NOTHING appears on the public
// wall until it is added here and deployed — by design, so the live page can
// never be spammed. The flow:
//
//   1. A visitor leaves a memory on /memories.
//   2. /api/memories-submit emails the full memory to the estate inbox,
//      including a ready-to-paste entry shaped exactly like the objects below.
//   3. Hugo (or Claude, on Hugo's say-so) pastes the approved memory into the
//      MEMORIES array, commits, and Vercel deploys it live.
//
// Convention: newest memory at the TOP of the array (the wall renders in array
// order). `message` may contain blank-line-separated paragraphs — the page
// splits on "\n\n".
//
// This mirrors how every other piece of content on the site lives in src/data
// (paintings.ts, content.ts). No database — same deliberate choice as the
// newsletter endpoint. If volume ever outgrows file-based moderation, the page
// reads only from MEMORIES, so swapping to a datastore is a contained change.
// =============================================================================

export interface Memory {
  /** Stable, unique id (slug of the name + short suffix). Used as the React key. */
  id: string;
  /** Who left the memory. Required. */
  name: string;
  /** How they knew Steve, e.g. "Student · TAGA 2012", "Friend", "Niece". Optional. */
  relationship?: string;
  /** Where they're writing from, e.g. "Lewes, East Sussex". Optional. */
  location?: string;
  /** The memory itself. Blank-line-separated paragraphs are rendered separately. */
  message: string;
}

// Real approved memories — paste new entries above, newest first.
// Shape: { id, name, relationship?, location?, message }
export const MEMORIES: Memory[] = [];
