/**
 * memoryStore — moderation + storage helpers for the Book of Memories
 * auto-publish flow (POST /api/memories-submit).
 *
 * Three concerns, each gated behind its own env var so the endpoint degrades
 * gracefully when a service isn't provisioned (never 500s the visitor):
 *
 *   1. moderateMemory()  — OpenAI omni-moderation (text + image, free).
 *      Gated behind OPENAI_API_KEY. If the key is ABSENT we FAIL SAFE: the
 *      memory is held for review rather than auto-published unmoderated.
 *
 *   2. KV (publish + read) — Vercel KV / Upstash Redis REST API.
 *      Gated behind KV_REST_API_URL + KV_REST_API_TOKEN. If KV isn't
 *      configured, publishing is skipped (the family still gets the email)
 *      and the public list reads empty — the page falls back to the
 *      file-based MEMORIES array.
 *
 *   3. Image handling — by design (requirement 4) a memory WITH an image is
 *      always HELD for the family's one-tap OK, so an uploaded image is never
 *      auto-displayed on the public wall. We therefore do NOT need public
 *      Blob storage for the auto-publish path: the image travels to the family
 *      as an email attachment, and they place it manually if they approve it.
 *      (Wiring public Blob storage would require the @vercel/blob SDK, which
 *      this change can't add — package.json is owned by another process.)
 *      A `prepareImageAttachment` helper turns the data URL into a Resend
 *      attachment, gated so an absent/oversized/invalid image is a no-op.
 *
 * Deliberately uses raw `fetch` against the OpenAI + Upstash REST APIs rather
 * than the openai / @vercel/kv SDKs, so this file adds ZERO new npm
 * dependencies — the project's package.json is owned by another process during
 * this change. The REST shapes are stable and documented.
 *
 * Self-contained — no cross-directory imports (gotcha #5 in CLAUDE.md). No
 * /src imports. Throws are confined; every exported function resolves a
 * structured result so callers never have to try/catch for control flow.
 */

// -----------------------------------------------------------------------------
// Shared shape — mirrors src/data/memories.ts `Memory`, plus storage metadata.
// The public list endpoint maps these down to the page's Memory shape.
// -----------------------------------------------------------------------------
export interface StoredMemory {
  id: string;
  name: string;
  relationship?: string;
  location?: string;
  message: string;
  /** ISO timestamp the memory was submitted. */
  createdAt: string;
}

// =============================================================================
// 1 · MODERATION — OpenAI omni-moderation-latest (text + image, free)
// =============================================================================

export type ModerationDecision =
  | { status: "clean" }
  | { status: "flagged"; categories: string[] }
  | { status: "unconfigured" } // no OPENAI_API_KEY — caller must fail safe (hold)
  | { status: "error"; detail: string }; // API call failed — caller must fail safe (hold)

interface OmniModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
}
interface OmniModerationResponse {
  results?: OmniModerationResult[];
}

/**
 * Moderate a memory's text and (optionally) an attached image with OpenAI's
 * free omni-moderation endpoint. The omni model accepts a multi-part `input`
 * array mixing `{ type: "text" }` and `{ type: "image_url" }` items, scoring
 * the whole submission at once.
 *
 * @param text       the memory message (+ any free-text the visitor supplied)
 * @param imageDataUrl  optional data: URL of the uploaded image (base64)
 */
export async function moderateMemory(
  text: string,
  imageDataUrl?: string,
): Promise<ModerationDecision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { status: "unconfigured" };

  // Build the multimodal input array. Text is always present; the image is
  // appended only when one was uploaded.
  const input: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: text.slice(0, 8000) }];
  if (imageDataUrl) {
    input.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input }),
      // A memorial wall is not latency-critical, but don't hang the request
      // forever if OpenAI is unreachable.
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const detail = `OpenAI moderation HTTP ${res.status}`;
      return { status: "error", detail };
    }

    const json = (await res.json()) as OmniModerationResponse;
    const result = json.results?.[0];
    if (!result) return { status: "error", detail: "OpenAI moderation: empty result" };

    if (result.flagged) {
      const categories = Object.entries(result.categories ?? {})
        .filter(([, v]) => v)
        .map(([k]) => k);
      return { status: "flagged", categories };
    }
    return { status: "clean" };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { status: "error", detail };
  }
}

// =============================================================================
// 2 · STORAGE — Vercel KV (Upstash Redis REST API)
// =============================================================================

const KV_KEY = "memories:published"; // a Redis list, newest pushed to the head

const kvConfig = (): { url: string; token: string } | null => {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
};

export const isKvConfigured = (): boolean => kvConfig() !== null;

/**
 * Run a single Upstash REST command, e.g. ["LPUSH", key, value]. Returns the
 * parsed `result` field, or null on any failure (never throws — the caller
 * treats a null as "storage unavailable" and degrades gracefully).
 */
async function kvCommand(command: (string | number)[]): Promise<unknown | null> {
  const cfg = kvConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[memoryStore] KV command failed: HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { result?: unknown; error?: string };
    if (json.error) {
      console.error("[memoryStore] KV command error:", json.error);
      return null;
    }
    return json.result ?? null;
  } catch (err) {
    console.error("[memoryStore] KV command threw:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Publish a memory to the public KV list (newest at the head). Returns true on
 * a confirmed write, false if KV isn't configured or the write failed.
 */
export async function publishMemory(memory: StoredMemory): Promise<boolean> {
  if (!isKvConfigured()) return false;
  const result = await kvCommand(["LPUSH", KV_KEY, JSON.stringify(memory)]);
  return result !== null;
}

/**
 * Read published memories from KV, newest first. Returns [] if KV isn't
 * configured or the read failed — the page then shows only its file-based
 * fallback entries, never an error.
 *
 * @param limit  max entries to return (the wall is finite by design)
 */
export async function readPublishedMemories(limit = 200): Promise<StoredMemory[]> {
  if (!isKvConfigured()) return [];
  const result = await kvCommand(["LRANGE", KV_KEY, 0, limit - 1]);
  if (!Array.isArray(result)) return [];
  const out: StoredMemory[] = [];
  for (const raw of result) {
    if (typeof raw !== "string") continue;
    try {
      const parsed = JSON.parse(raw) as StoredMemory;
      if (parsed && typeof parsed.id === "string" && typeof parsed.message === "string") {
        out.push(parsed);
      }
    } catch {
      // Skip a corrupt entry rather than failing the whole read.
    }
  }
  return out;
}

// =============================================================================
// 3 · IMAGE — Resend attachment (no public storage; held-for-review by policy)
// =============================================================================

/** A Resend email attachment: { filename, content (base64 string) }. */
export interface EmailAttachment {
  filename: string;
  content: string; // base64 payload (no data: prefix)
  contentType?: string;
}

/**
 * Turn a base64 image data URL into a Resend attachment so the family can see
 * the photo a visitor attached. Returns null if the string isn't a supported
 * base64 image data URL. Because an image always HOLDS the memory (requirement
 * 4), this is the image's only destination — it never reaches the public wall
 * automatically.
 */
export function prepareImageAttachment(dataUrl: string, idHint: string): EmailAttachment | null {
  const match = /^data:(image\/(png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const contentType = match[1];
  const subtype = match[2];
  const ext = subtype === "jpeg" ? "jpg" : subtype;
  return {
    filename: `${idHint}.${ext}`,
    content: match[3],
    contentType,
  };
}
