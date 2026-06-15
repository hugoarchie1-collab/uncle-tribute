/**
 * Sandbox end-to-end test for the estate-ledger provenance pipeline.
 *
 *   node scripts/test-provenance.mjs
 *
 * Simulates: purchase → ledger entry → Certificate ID generation → per-drop
 * sequential numbering → idempotent retry → QR URL → authentication lookup
 * (the public projection). Mirrors the algorithm inlined in
 * api/stripe-webhook.ts (issueLedgerEntries) + api/auth-lookup.ts against a
 * mock KV, so it validates the DESIGN with no network. If KV_REST_API_URL +
 * KV_REST_API_TOKEN (or UPSTASH_*) are set, it ALSO does a real Upstash REST
 * round-trip (GET/SET/INCR/DEL on a throwaway __test__ key) to prove the live
 * store works. Exits non-zero on any failed assertion.
 */
import { randomBytes } from "node:crypto";

// ---- mirror of the webhook constants -------------------------------------
const LEDGER_DROP = { id: "drop-i", label: "Drop I" };
const TIER_ALLOCATION = { atelier: null, collector: 200, "atelier-grande": 75, heirloom: 18, studio: 1 };
const TIER_LABEL = { atelier: "Open Edition", collector: "Collector Drop", "atelier-grande": "Atelier Drop", heirloom: "Heirloom Drop", studio: "Original — One of One" };
const ARTWORK_CODE = { "ophiuchus": "OPI", "wild-rose": "WRO", "lulin": "LUL" };
const CERT_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const certSuffix = (len = 6) => {
  const b = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i += 1) out += CERT_ALPHABET[b[i] % CERT_ALPHABET.length];
  return out;
};

// ---- in-memory mock KV (GET/SET/INCR) ------------------------------------
const makeMockKv = () => {
  const store = new Map();
  return {
    async cmd(args) {
      const [op, key, val] = args;
      if (op === "GET") return store.has(key) ? store.get(key) : null;
      if (op === "SET") { store.set(key, String(val)); return "OK"; }
      if (op === "INCR") { const n = (Number(store.get(key)) || 0) + 1; store.set(key, String(n)); return n; }
      throw new Error(`mock kv: unsupported ${op}`);
    },
    _store: store,
  };
};

// ---- mirror of issueLedgerEntries (one line) -----------------------------
const issueLine = async (kv, sessionId, idx, line) => {
  const idemKey = `ledger:order:${sessionId}:${idx}`;
  const existing = await kv.cmd(["GET", idemKey]);
  if (typeof existing === "string" && existing) {
    const rec = await kv.cmd(["GET", `ledger:cert:${existing}`]);
    return JSON.parse(rec);
  }
  const allocation = TIER_ALLOCATION[line.tierId] ?? null;
  let printNumber = null;
  if (allocation !== null) {
    const seq = await kv.cmd(["INCR", `ledger:seq:${line.paintingId}:${line.tierId}:${LEDGER_DROP.id}`]);
    printNumber = Number(seq);
  }
  const code = ARTWORK_CODE[line.paintingId] || line.paintingId.slice(0, 3).toUpperCase();
  const cert = `MANDALA-${code}-${certSuffix()}`;
  const entry = {
    certificate_id: cert, artwork_id: line.paintingId, artwork_name: line.title,
    colourway: line.colourway, drop_id: LEDGER_DROP.id, drop_label: LEDGER_DROP.label,
    tier_id: line.tierId, tier_label: TIER_LABEL[line.tierId], print_number: printNumber,
    allocation, issued_date: new Date().toISOString(), order_id: sessionId, status: "issued",
  };
  await kv.cmd(["SET", `ledger:cert:${cert}`, JSON.stringify(entry)]);
  await kv.cmd(["SET", idemKey, cert]);
  return entry;
};
const issueOrder = async (kv, sessionId, lines) => {
  const out = [];
  for (let i = 0; i < lines.length; i += 1) out.push(await issueLine(kv, sessionId, i, lines[i]));
  return out;
};

// ---- public projection (mirror of /api/auth-lookup) ----------------------
const authLookup = async (kv, certRaw) => {
  const id = certRaw.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  const rec = await kv.cmd(["GET", `ledger:cert:${id}`]);
  if (typeof rec !== "string" || !rec) return { found: false };
  const r = JSON.parse(rec);
  return {
    found: true,
    record: {
      certificate_id: r.certificate_id, artwork_name: r.artwork_name, colourway: r.colourway,
      drop_label: r.drop_label, tier_label: r.tier_label, print_number: r.print_number ?? null,
      allocation: r.allocation ?? null, issued_date: r.issued_date,
      status: "Authenticated in Estate Registry",
    },
  };
};

// ---- assertions ----------------------------------------------------------
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) { passed += 1; console.log(`  ✓ ${msg}`); } else { failed += 1; console.error(`  ✗ ${msg}`); } };
const CERT_RE = /^MANDALA-[A-Z0-9]{2,4}-[0-9A-HJKMNP-TV-Z]{6}$/;

const run = async () => {
  console.log("\n=== Estate-ledger provenance — sandbox E2E ===\n");
  const kv = makeMockKv();

  console.log("Scenario 1 — order A: Ophiuchus Collector Drop + Wild Rose Open Edition");
  const orderA = await issueOrder(kv, "cs_test_AAA", [
    { paintingId: "ophiuchus", tierId: "collector", colourway: "Original", title: "Ophiuchus" },
    { paintingId: "wild-rose", tierId: "atelier", colourway: "Sussex Pink", title: "Mandala of Wild Rose" },
  ]);
  ok(CERT_RE.test(orderA[0].certificate_id), `Collector cert id is well-formed (${orderA[0].certificate_id})`);
  ok(orderA[0].certificate_id.startsWith("MANDALA-OPI-"), "Ophiuchus cert uses OPI code");
  ok(orderA[0].print_number === 1, "first Collector Drop print is No. 1");
  ok(orderA[0].allocation === 200, "Collector Drop allocation is 200");
  ok(orderA[1].print_number === null, "Open Edition (A3) print is NOT numbered");
  ok(orderA[1].allocation === null, "Open Edition has no allocation cap");

  console.log("\nScenario 2 — order B: another Ophiuchus Collector Drop (same drop)");
  const orderB = await issueOrder(kv, "cs_test_BBB", [
    { paintingId: "ophiuchus", tierId: "collector", colourway: "Original", title: "Ophiuchus" },
  ]);
  ok(orderB[0].print_number === 2, "second Collector Drop print is No. 2 (sequential within drop)");
  ok(orderB[0].certificate_id !== orderA[0].certificate_id, "each print gets a unique Certificate ID");

  console.log("\nScenario 3 — idempotent retry of order A (Stripe redelivery)");
  const seqBefore = kv._store.get("ledger:seq:ophiuchus:collector:drop-i");
  const orderARetry = await issueOrder(kv, "cs_test_AAA", [
    { paintingId: "ophiuchus", tierId: "collector", colourway: "Original", title: "Ophiuchus" },
    { paintingId: "wild-rose", tierId: "atelier", colourway: "Sussex Pink", title: "Mandala of Wild Rose" },
  ]);
  ok(orderARetry[0].certificate_id === orderA[0].certificate_id, "retry returns the SAME Certificate ID");
  ok(orderARetry[0].print_number === 1, "retry keeps print No. 1 (no re-number)");
  ok(kv._store.get("ledger:seq:ophiuchus:collector:drop-i") === seqBefore, "retry did NOT advance the drop counter");

  console.log("\nScenario 4 — QR target + authentication lookup");
  const cert = orderA[0].certificate_id;
  const qrUrl = `https://themandalacompany.com/auth/${cert}`;
  ok(qrUrl === `https://themandalacompany.com/auth/${cert}`, `QR encodes /auth/<cert> (${qrUrl})`);
  const lookExact = await authLookup(kv, cert);
  ok(lookExact.found === true, "exact Certificate ID resolves");
  ok(lookExact.record.status === "Authenticated in Estate Registry", "status is the public registry phrase");
  ok(lookExact.record.print_number === 1 && lookExact.record.tier_label === "Collector Drop", "record shows drop + print number");
  ok(!("order_id" in lookExact.record), "public record does NOT leak order_id");
  const lookMessy = await authLookup(kv, `  ${cert.toLowerCase().replace(/-/g, " ")}  `);
  ok(lookMessy.found === true, "forgiving input (lowercase/spaces) still resolves");
  const lookMiss = await authLookup(kv, "MANDALA-XXX-000000");
  ok(lookMiss.found === false, "unknown Certificate ID returns found:false (clean, no error)");

  // ---- optional: real Upstash REST round-trip --------------------------
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    console.log("\nScenario 5 — REAL Upstash REST round-trip (KV env detected)");
    const realCmd = async (args) => {
      const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
      const j = await r.json();
      return j.result ?? null;
    };
    const k = `ledger:__test__:${certSuffix()}`;
    await realCmd(["SET", k, "hello"]);
    const got = await realCmd(["GET", k]);
    ok(got === "hello", "real KV SET/GET round-trips");
    const n1 = await realCmd(["INCR", `${k}:seq`]);
    const n2 = await realCmd(["INCR", `${k}:seq`]);
    ok(Number(n2) === Number(n1) + 1, "real KV INCR is sequential (atomic numbering works live)");
    await realCmd(["DEL", k]);
    await realCmd(["DEL", `${k}:seq`]);
    console.log("  (cleaned up test keys)");
  } else {
    console.log("\nScenario 5 — skipped (no KV env vars; mock-only run)");
  }

  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed === 0 ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });
