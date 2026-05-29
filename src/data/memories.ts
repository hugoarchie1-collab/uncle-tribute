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

// -----------------------------------------------------------------------------
// SAMPLE ENTRIES — so the wall reads as alive in preview. Delete or replace
// these two before the first public push (or keep them if they ring true). Real
// approved memories should be pasted ABOVE them, newest first.
// -----------------------------------------------------------------------------
export const MEMORIES: Memory[] = [
  {
    id: "sample-jan-w",
    name: "Jan W.",
    relationship: "Student · Brighton, 2003",
    location: "Hove, East Sussex",
    message:
      "Steve never once made the geometry feel like maths. He'd draw a single arc and tell you the whole universe was already inside it, and somehow you believed him.\n\nI still have the first rose window I drew under his eye. It's crooked. I'll never change it.",
  },
  {
    id: "sample-michael-r",
    name: "Michael R.",
    relationship: "Friend",
    location: "Lewes",
    message:
      "We'd sit in the studio late and he'd talk about the Sun Star as if it were an old friend. The world was a smaller, kinder place with Steve drawing in the middle of it.",
  },
];
