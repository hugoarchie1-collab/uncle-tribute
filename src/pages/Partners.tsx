import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { AssetImage } from "../components/AssetImage";
import { PageMasthead } from "../components/PageMasthead";
import {
  EYEBROW_MUTED,
  EYEBROW_TIGHT,
  TITLE,
  SUBTITLE,
  META,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { asset } from "../lib/asset";
import { PAINTINGS, ESTATE_AUTHENTICATION, paintingImageAlt } from "../data/paintings";
import { ARTWORK_SIZES } from "../lib/artworkSizes";
import { MEMORIAL_QUOTE } from "../data/content";

/**
 * /trade — PARTNERS. The estate's page for BULK and PROJECT buyers (hotels,
 * wellness, workplaces, healthcare, restaurants, residential schemes and the
 * designers and consultants who specify for them), with the introducer door
 * as a quieter second section lower down. Rebuilt 2026-09-02 from a 4-agent
 * research pass (27 competitor trade pages, 32 design references, a sector /
 * offer / qualification strategy, and the repo's own assets).
 *
 * ⚠️ PRICE-SILENT BY DESIGN (standing owner rule). No trade percentages, no
 * commission figures, no "affiliate / referral / earn / commission" wording
 * anywhere in the DOM. Retail prices are public on the product pages; project
 * terms are prepared privately and sent in the proposal. The introducer
 * section says "share in every placement" and nothing more.
 *
 * ⚠️ REAL CLAIMS ONLY. Every credential on this page is a verbatim string from
 * src/data/content.ts (CREDENTIALS / MEMORIAL_QUOTE). No logos, no
 * testimonials, no "insured", no install service, no fixed project lead time,
 * no fire rating, no glazing promise the studio has not confirmed, and the
 * printer is never named (ESTATE_AUTHENTICATION.printer is the approved line).
 *
 * ⚠️ NO ROOM MOCK-UPS. Every image is either Stephen's own painting or a real
 * work. Hugo is making the in-room imagery himself; see the note above the
 * artwork helpers. The Arista SunStar / Farmacy material was removed from this
 * page on 2026-09-03 — Hugo is not releasing it publicly yet.
 *
 * Buyer form → kind:"trade-application" (api/newsletter-subscribe.ts, extended
 * 2026-09-02 with sector / project / pieces / spaces / sizes / timeline /
 * introducedBy). Introducer form → kind:"representative-application" (unchanged).
 */

// ── shared layout recipes ────────────────────────────────────────────────────

const WRAP =
  "mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12";

/** Section head: eyebrow left · quiet meta right · hairline beneath (the house
 *  header-row device). */
/** One section heading, and nothing above it.
 *
 * ⚠️ This replaces a `SectionHead` that put a small rust label on the left, a
 * small grey label on the right, and a full-width hairline over the pair — at
 * the top of ELEVEN sections. That is the eyebrow/meta rule Hugo had removed
 * from every page masthead in July ("the two lines at the top … looks crap on
 * every page"), reintroduced once per section, and it is what made this page
 * read as gappy and confusing: every section opened with two pieces of
 * near-identical small print before it said anything. A section now opens with
 * its own sentence, at heading size, and nothing else. Do not put a label rule
 * back above these. */
const Head = ({ children, sub }: { children: ReactNode; sub?: ReactNode }) => (
  <Reveal as="div" className="mb-8 md:mb-12 text-center">
    <h2 className={cn(TITLE, "m-0 mx-auto max-w-[24ch]")}>{children}</h2>
    {sub && <p className={cn(SUBTITLE, "m-0 mt-5 md:mt-6 mx-auto max-w-[62ch]")}>{sub}</p>}
  </Reveal>
);

/** The suite-grid tile edge. Every colourway square on the page is exactly this
 *  wide, in every group, so the grid reads as one set of squares rather than
 *  rows that each chose their own scale. */
const TILE = "clamp(64px, 9vw, 152px)";
const TILE_GAP = "10px";

const ITALIC_STYLE = { fontVariationSettings: '"opsz" 40, "wght" 400' } as const;
const Em = ({ children }: { children: ReactNode }) => (
  <em className="italic font-normal" style={ITALIC_STYLE}>
    {children}
  </em>
);

// ── the work (Stephen's own paintings — never a room mock-up) ───────────────
//
// ⚠️ NO IN-ROOM IMAGERY ON THIS PAGE. An earlier pass used the /img/truesize
// composites (the artwork placed on a photographed wall). Hugo, 2026-09-02:
// "i never asked you to add the in the room images not until ive done from
// canvy.com … take it down from all site." The only room-like image that
// on this page is the painting itself. Do not reintroduce /img/truesize here;
// when Hugo's own room images exist they will arrive under new filenames (the
// assets are cached immutable for a year). The Arista SunStar photograph and
// the credentials band that carried it were removed 2026-09-03 — Hugo is not
// releasing that material publicly yet, so do not put it back.


/** The demonstration painting for the colourway-suite strip: the work Stephen
 *  left in the most colourways, so the "one painting, every mood" claim is
 *  carried by the widest real example in the catalogue. Chosen from the data,
 *  so it stays correct if the catalogue changes. */
const availableWays = (p: (typeof PAINTINGS)[number]) => p.colourways.filter((c) => c.available);
// Sorted by colourway count, ties broken by id so a data edit can never silently
// swap the section's subject. `?? PAINTINGS[0]` guards module scope: this runs at
// import time, so throwing here would reject the lazy chunk and blank the ROUTE,
// not just this section.
const MOOD_PAINTING =
  [...PAINTINGS].sort(
    (a, b) => availableWays(b).length - availableWays(a).length || a.id.localeCompare(b.id),
  )[0] ?? PAINTINGS[0];
const MOOD_WAYS = MOOD_PAINTING ? availableWays(MOOD_PAINTING) : [];

// Every OTHER painting Stephen left in more than one colourway. The demonstration
// painting is excluded: it is shown ten lines above at full size, and rendering
// its five squares again here read as a duplicate. Ordered richest-first then
// INTERLEAVED largest/smallest — the groups are a fixed tile size and wrap, so in
// catalogue order the wide groups collide and every row ends half empty.
const SUITES = (() => {
  const all = PAINTINGS.filter((p) => p.id !== MOOD_PAINTING?.id)
    .map((p) => ({ painting: p, ways: availableWays(p) }))
    .filter((x) => x.ways.length > 1)
    .sort((a, b) => b.ways.length - a.ways.length || a.painting.id.localeCompare(b.painting.id));
  const out: typeof all = [];
  let lo = 0;
  let hi = all.length - 1;
  while (lo <= hi) {
    out.push(all[lo]);
    lo += 1;
    if (lo <= hi) {
      out.push(all[hi]);
      hi -= 1;
    }
  }
  return out;
})();

// ── sectors ──────────────────────────────────────────────────────────────────

/** THE ROOM LEDGER — every sector, its rooms, its sizes and what the estate
 *  would do, all six on screen at once, in type only.
 *
 *  ⚠️ This replaces a tab strip that showed ONE sector at a time with a painting
 *  chosen for it. Hugo binned that outright: "i hate how you click on each
 *  section on the top list of business and a random piece comes up its shit".
 *  He was right on the substance — no painting belongs to hotels more than it
 *  belongs to spas, so any pairing is a hunch presented as a recommendation, and
 *  a widget made the reader work before the page said anything.
 *
 *  So: NO IMAGERY IS BOUND TO A SECTOR HERE, and nothing is hidden behind a
 *  click. A survey of 19 premium B2B pages found none of them use an on-page
 *  sector tab strip, and the ones that do pair a picture to an industry only
 *  ever use a REAL named installed project — which this estate does not have
 *  yet. A ledger is also the register the rest of the site already speaks in
 *  (the home page's material ledger, the spec rows, the registry).
 *
 *  Same six labels still feed the form's Sector question. */
type SectorRow = {
  label: string;
  rooms: string;
  sizes: string;
  /** One clause — what the estate actually does for that setting. */
  does: string;
};

const SECTOR_ROWS: SectorRow[] = [
  {
    label: "Hotels",
    rooms: "Bedrooms · Corridors · Suites · Lobby",
    sizes: "A3 · A2 · A1",
    does: "A pair at A3 beside each bed, and a corridor that runs one painting through its colourways, so every door opens on its own colour.",
  },
  {
    label: "Wellness & spa",
    rooms: "Treatment rooms · Relaxation lounge · Reception · Studios",
    sizes: "A3 · A2 · A1",
    does: "Calm colourways where people lie still, a warmer one for the lounge, and a single larger piece where guests arrive.",
  },
  {
    label: "Workplace",
    rooms: "Reception · Meeting rooms · Breakout · Boardroom",
    sizes: "A2 · A1",
    does: "One artist through every meeting room, each in its own colourway, so wayfinding and the look of the floor come from one decision.",
  },
  {
    label: "Healthcare & hospices",
    rooms: "Family rooms · Quiet rooms · Staff spaces · Reception",
    sizes: "A3 · A2",
    does: "Gentle colourways for the rooms families wait in, and for the spaces staff retreat to. Tell us the setting and the estate will confirm what framing can be arranged for it.",
  },
  {
    label: "Restaurants & clubs",
    rooms: "Dining room · Bar · Private dining · Members' lounge",
    sizes: "A1 · commission",
    does: "A dining room is looked at for hours, so it carries the boldest colourway: one large piece where the room turns, a run of the same work through the bar.",
  },
  {
    label: "Residential & show homes",
    rooms: "Living room · Bedroom · Hallway · Amenity lounge",
    sizes: "A3 · A2 · A1",
    does: "A set that photographs well, framed for ordinary walls and delivered on a date — every print traceable in the Estate Registry.",
  },
];

const SECTOR_LABELS = SECTOR_ROWS.map((r) => r.label);


// ── the offer (what the estate provides) ─────────────────────────────────────

const PROVIDES: { title: string; body: string }[] = [
  {
    title: "A proposal with the works on your walls",
    body: "Send a photograph or an elevation. You get the pieces in place, sized true, with one quotation for the whole scheme.",
  },
  {
    title: "Chosen by the family",
    body: "Polly, Stephen's sister, selects the works and colourways against your scheme and stays your one point of contact.",
  },
  {
    title: "Framed and glazed as standard",
    body: "Solid oak, white or black frames, a white window mount and float glass. Or the same image as a fine-art canvas print, if a room suits it better. Framed is the default on every project.",
  },
  {
    title: "Specification sheets on request",
    body: "Dimensions in every size, frame and glazing details, edition and registry notes, so a piece can be specified exactly as it will arrive.",
  },
  {
    title: "Delivered free, worldwide",
    body: "Made to order on the Sussex coast, packed flat and boxed, never rolled, and delivered to site or to your consolidator.",
  },
  {
    title: "One invoice for the project",
    body: "Settled through a secure payment link. Account terms for registered studios and operators. No portal, no queue.",
  },
  {
    title: "Provenance a guest can check",
    body: "Every print is estate-stamped, numbered where the edition is numbered, and issued with a Certificate of Authenticity that can be verified in the Estate Registry.",
  },
  {
    title: "Your scheme stays on file",
    body: "For the next site and the next refresh, the same works and colourways can be reordered without starting again.",
  },
];

const STEPS: { label: string; title: string; body: string }[] = [
  {
    label: "Brief",
    title: "Tell us the spaces, the count and the date.",
    body: "A photograph or a plan helps. A sentence is enough to begin.",
  },
  {
    label: "Proposal",
    title: "Your rooms, with the work in them.",
    body: "Sized true, with one quotation for the whole scheme, held in confidence for your studio.",
  },
  {
    label: "Approve",
    title: "Change colourways, sizes or frames as often as you need.",
    body: "Change colourways, sizes or frames as often as you need. Nothing is made until you are happy with the scheme.",
  },
  {
    label: "Made & delivered",
    title: "Each piece made to order, estate-stamped, framed and packed flat.",
    body: "A single framed print is dispatched within 2–4 working days. A project schedule is confirmed in the proposal.",
  },
];

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "Is there a minimum order?",
    a: "No. A single feature piece and a whole building are handled the same way, by the family.",
  },
  {
    q: "What does a proposal cost?",
    a: "Nothing. It is how every project begins.",
  },
  {
    q: "Can we see one piece before we commit?",
    a: "Ask when you write. The estate will tell you what can be arranged for your project before anything is made.",
  },
  {
    q: "How is a project invoiced?",
    a: "One invoice for the scheme, settled through a secure payment link. Account terms are available to registered studios and operators.",
  },
  {
    q: "Can we mix sizes, frames and colourways in one scheme?",
    a: "Yes. Most schemes do. Every combination is priced in the proposal.",
  },
  {
    q: "Can framing be adapted for a guest room or a clinical space?",
    a: "Frames are solid oak, white or black with float glass as standard. Tell us the setting and the proposal will confirm what can be done for it.",
  },
  {
    q: "Can our venue have a work to itself?",
    a: "Exclusivity by location can be arranged for a scheme. Ask when you write.",
  },
  {
    q: "Who makes the prints?",
    a: `${ESTATE_AUTHENTICATION.printer}, on Hahnemühle Photo Rag, to order. The estate does not name its makers.`,
  },
];

// ── option lists for the project form ────────────────────────────────────────

const ROLES = [
  "Interior designer or architect",
  "Art consultant",
  "Owner or director",
  "Procurement or FF&E",
  "Developer",
  "Facilities or estates",
  "Other",
] as const;
const PIECES = ["1–5", "6–20", "21–50", "51–150", "150+", "Not sure yet"] as const;
const SPACES = [
  "Bedrooms",
  "Corridors",
  "Lobby or reception",
  "Restaurant or bar",
  "Spa or treatment rooms",
  "Meeting rooms",
  "Feature wall",
  "Whole building",
] as const;
const SIZES = ["A4", "A3", "A2", "A1", "Larger or hand-painted", "Canvas", "Not sure"] as const;
const TIMELINES = [
  "Within a month",
  "1–3 months",
  "3–6 months",
  "6 months or more",
  "No date yet",
] as const;

type Status = "idle" | "submitting" | "success" | "error";

const FIELD_LABEL =
  "block font-sans text-[13px] 2xl:text-[15px] 3xl:text-[17px] 4xl:text-[19px] font-semibold tracking-[0.01em] text-ink/60 mb-2";
const FIELD_INPUT =
  "w-full bg-transparent border-0 border-b border-line focus:border-accent focus:outline-none px-0 py-3 font-sans text-[16px] 2xl:text-[18px] 3xl:text-[21px] 4xl:text-[24px] text-ink placeholder:text-ink/30 transition-colors rounded-none";
const CHIP =
  // 44px is Apple's minimum comfortable tap target, and these chips are a primary
// interaction on the page's conversion form — they were 40. `font-semibold` when
// checked so the selected state is carried by WEIGHT as well as ring colour: a
// ring-colour-only signal is information conveyed by colour alone.
  "inline-flex items-center min-h-[44px] 3xl:min-h-[48px] px-4 3xl:px-5 rounded-full ring-1 ring-line font-sans text-[14px] 2xl:text-[15px] 3xl:text-[18px] 4xl:text-[20px] text-ink-muted cursor-pointer select-none transition-colors hover:ring-accent/60 hover:text-ink has-[:checked]:ring-accent has-[:checked]:text-ink has-[:checked]:font-semibold has-[:checked]:bg-accent/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent";

const Honeypot = () => (
  <input
    type="text"
    name="botcheck"
    tabIndex={-1}
    autoComplete="off"
    aria-hidden="true"
    style={{
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: 0,
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0,0,0,0)",
      whiteSpace: "nowrap",
      border: 0,
    }}
  />
);

const Chips = ({ name, options, label }: { name: string; options: readonly string[]; label: string }) => (
  <fieldset className="m-0 p-0 border-0 min-w-0">
    <legend className={FIELD_LABEL}>{label}</legend>
    <div className="flex flex-wrap gap-2 3xl:gap-3">
      {options.map((o) => (
        <label key={o} className={CHIP}>
          <input type="checkbox" name={name} value={o} className="sr-only" />
          {o}
        </label>
      ))}
    </div>
  </fieldset>
);

// ── the project form (buyers) ────────────────────────────────────────────────

const ProjectForm = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const successRef = useRef<HTMLParagraphElement>(null);
  // The form unmounts on success, which drops focus to <body> — the top of a
  // 10,000px page for anyone on a keyboard. Move it to the confirmation, which
  // also makes screen readers announce it.
  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) || "").trim();
    const all = (k: string) => data.getAll(k).map(String).join(", ");

    if (get("botcheck")) {
      setStatus("success");
      form.reset();
      return;
    }
    const name = get("name");
    const email = get("email");
    const studio = get("studio");
    if (!name || !email || !studio) {
      setStatus("error");
      setErrorMsg("Please add your name, your studio or company, and an email we can reply to.");
      return;
    }
    // noValidate is set (the browser's own bubbles are off-brand), so the
    // address is checked here rather than costing a round-trip to be told.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      setErrorMsg("That email address doesn't look right — we'd hate to reply into thin air.");
      return;
    }
    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "trade-application",
          name,
          email,
          studio,
          website: get("website"),
          role: get("role"),
          sector: get("sector"),
          project: get("project"),
          pieces: get("pieces"),
          spaces: all("spaces"),
          sizes: all("sizes"),
          timeline: get("timeline"),
          introducedBy: get("introducedBy"),
          message: get("message"),
          botcheck: "",
        }),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setErrorMsg(
        body?.error ||
          "We couldn't send that just now. Please try again, or email info@themandalacompany.com directly — we don't want to lose your project.",
      );
    } catch {
      setStatus("error");
      setErrorMsg("We couldn't reach the estate just now. Try again, or email info@themandalacompany.com.");
    }
  };

  if (status === "success") {
    return (
      <div className="ring-1 ring-line p-7 md:p-9 3xl:p-12">
        <p
          ref={successRef}
          tabIndex={-1}
          className="font-display font-semibold text-[clamp(26px,3vw,44px)] text-ink m-0 mb-3 outline-none"
        >
          Thank you. It's with the family.
        </p>
        <p className={cn(SUBTITLE, "max-w-none m-0")}>
          A member of the family replies personally, usually within two working days, with the works
          placed on your walls and one quotation for the scheme. If it's pressing, write to{" "}
          <a href="mailto:info@themandalacompany.com?subject=Project%20enquiry" className="text-accent hover:underline">
            info@themandalacompany.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="ring-1 ring-line p-6 md:p-9 3xl:p-12">
      <Honeypot />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 3xl:gap-x-12 gap-y-6 3xl:gap-y-8">
        <label className="block">
          <span className={FIELD_LABEL}>Your name</span>
          <input name="name" required autoComplete="name" className={FIELD_INPUT} placeholder="Jane Smith" />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>Work email</span>
          <input name="email" type="email" required autoComplete="email" className={FIELD_INPUT} placeholder="jane@studio.com" />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>Studio, company or venue</span>
          <input name="studio" required autoComplete="organization" className={FIELD_INPUT} placeholder="Studio name" />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>Website</span>
          <input name="website" autoComplete="url" className={FIELD_INPUT} placeholder="studio.com" />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>Your role</span>
          <select name="role" defaultValue="" className={cn(FIELD_INPUT, "appearance-none")}>
            <option value="">Select…</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>Sector</span>
          <select
            name="sector"
            defaultValue=""
            className={cn(FIELD_INPUT, "appearance-none")}
          >
            <option value="">Select…</option>
            {SECTOR_LABELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
            <option value="Other">Other</option>
          </select>
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>The project</span>
          <input name="project" className={FIELD_INPUT} placeholder="e.g. 40-bedroom hotel, Bath, refurbishment" />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>Number of pieces</span>
          <select name="pieces" defaultValue="" className={cn(FIELD_INPUT, "appearance-none")}>
            <option value="">Select…</option>
            {PIECES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>When it needs to be on the wall</span>
          <select name="timeline" defaultValue="" className={cn(FIELD_INPUT, "appearance-none")}>
            <option value="">Select…</option>
            {TIMELINES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <Chips name="spaces" options={SPACES} label="Spaces to fill" />
        </div>
        <div className="sm:col-span-2">
          <Chips name="sizes" options={SIZES} label="Sizes in mind" />
        </div>
        <label className="block sm:col-span-2">
          <span className={FIELD_LABEL}>Anything else</span>
          <textarea
            name="message"
            rows={4}
            className={cn(FIELD_INPUT, "leading-[1.6] resize-none")}
            placeholder="The scheme, the palette, a link to a plan or a mood board."
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={FIELD_LABEL}>Introduced by (if someone sent you)</span>
          <input name="introducedBy" className={FIELD_INPUT} placeholder="A designer, a venue, a friend of the estate" />
        </label>
      </div>

      {errorMsg && (
        <p className="mt-5 font-sans text-[14px] 3xl:text-[17px] text-accent m-0" role="alert">
          {errorMsg}
        </p>
      )}

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <button type="submit" disabled={status === "submitting"} className={cn(BTN_PRIMARY, "w-full sm:w-auto")}>
          {status === "submitting" ? "Sending…" : "Send me a proposal"}
          <span aria-hidden="true" className="ml-2">→</span>
        </button>
        <p className={cn(META, "m-0")}>A person replies, usually within two working days.</p>
      </div>
    </form>
  );
};

// ── the introducer form (kept short, kept quiet) ─────────────────────────────

const IntroducerForm = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const successRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) || "").trim();
    if (get("botcheck")) {
      setStatus("success");
      form.reset();
      return;
    }
    const name = get("name");
    const email = get("email");
    if (!name || !email) {
      setStatus("error");
      setErrorMsg("Please add your name and email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      setErrorMsg("That email address doesn't look right.");
      return;
    }
    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "representative-application",
          name,
          email,
          company: get("company"),
          reach: get("reach"),
          message: get("message"),
          botcheck: "",
        }),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setErrorMsg(body?.error || "Couldn't send just now. Try again, or email us.");
    } catch {
      setStatus("error");
      setErrorMsg("Couldn't reach the estate. Try again, or email info@themandalacompany.com.");
    }
  };

  if (status === "success") {
    return (
      <div className="ring-1 ring-line p-7 md:p-9">
        <p
          ref={successRef}
          tabIndex={-1}
          className="font-display font-semibold text-[clamp(24px,2.6vw,38px)] text-ink m-0 mb-3 outline-none"
        >
          Thank you.
        </p>
        <p className={cn(SUBTITLE, "max-w-none m-0")}>
          We'll be in touch personally and in confidence.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="ring-1 ring-line p-6 md:p-9 3xl:p-12">
      <Honeypot />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        <label className="block">
          <span className={FIELD_LABEL}>Your name</span>
          <input name="name" required autoComplete="name" className={FIELD_INPUT} placeholder="Jane Smith" />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>Email</span>
          <input name="email" type="email" required autoComplete="email" className={FIELD_INPUT} placeholder="jane@studio.com" />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>Company</span>
          <input name="company" autoComplete="organization" className={FIELD_INPUT} placeholder="If you have one" />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>Where you place work</span>
          <select name="reach" defaultValue="" className={cn(FIELD_INPUT, "appearance-none")}>
            <option value="">Select…</option>
            <option>Hotels &amp; hospitality</option>
            <option>Wellness &amp; healthcare</option>
            <option>Workplace &amp; developers</option>
            <option>Restaurants &amp; bars</option>
            <option>Residential &amp; property</option>
            <option>Galleries &amp; advisory</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={FIELD_LABEL}>The project you have in mind</span>
          <textarea name="message" rows={3} className={cn(FIELD_INPUT, "leading-[1.6] resize-none")} placeholder="Who, where, and roughly when." />
        </label>
      </div>
      {errorMsg && (
        <p className="mt-5 font-sans text-[14px] 3xl:text-[17px] text-accent m-0" role="alert">
          {errorMsg}
        </p>
      )}
      <button type="submit" disabled={status === "submitting"} className={cn(BTN_SECONDARY, "mt-8 w-full sm:w-auto")}>
        {status === "submitting" ? "Sending…" : "Bring the estate a project"}
        <span aria-hidden="true" className="ml-2">→</span>
      </button>
    </form>
  );
};

// ── scale diagram (SVG, hairlines, no box) ───────────────────────────────────

/** A 3.2 m wall with a 2 m sofa and the three project sizes drawn to ONE scale
 *  (cm from artworkSizes — the single source of truth for print dimensions),
 *  hung with their centres 150 cm from the floor. */
const SIZE_LEGEND = ARTWORK_SIZES.filter(
  (z) => z.id === "a3" || z.id === "a2" || z.id === "a1",
);

const ScaleDiagram = () => {
  const W = 300; // cm of wall drawn
  const H = 210; // cm of wall drawn (floor sits on y = H)
  const CENTRE = 150; // cm from the floor to the centre of every frame — the
  // gallery hanging height, and the reason the three sizes share one baseline.
  const sofaW = 200;
  const sofaX = (W - sofaW) / 2;
  const sizes = ARTWORK_SIZES.filter((s) => s.id === "a3" || s.id === "a2" || s.id === "a1");
  const gap = 16;
  const total = sizes.reduce((n, s) => n + s.cm, 0) + gap * (sizes.length - 1);
  const startX = (W - total) / 2;
  const frames = sizes.map((s, i) => ({
    ...s,
    x: startX + sizes.slice(0, i).reduce((n, q) => n + q.cm + gap, 0),
    y: H - CENTRE - s.cm / 2,
  }));
  const stroke = "rgb(237 230 214 / 0.5)";
  const soft = "rgb(237 230 214 / 0.26)";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto block"
      role="img"
      aria-label={`The project print sizes — ${frames
        .map((f) => `${f.label} at ${f.cm} cm`)
        .join(", ")} — drawn to one scale above a two-metre sofa, each hung with its centre ${CENTRE} cm from the floor`}
    >
      {/* floor */}
      <line x1="0" y1={H} x2={W} y2={H} stroke={stroke} strokeWidth="0.7" />
      {/* sofa silhouette — 2 m, the reference object */}
      <g stroke={soft} strokeWidth="0.7" fill="none">
        <rect x={sofaX} y={H - 34} width={sofaW} height="20" rx="3" />
        <rect x={sofaX + 5} y={H - 56} width={sofaW - 10} height="24" rx="3" />
        <line x1={sofaX + 9} y1={H - 14} x2={sofaX + 9} y2={H} />
        <line x1={sofaX + sofaW - 9} y1={H - 14} x2={sofaX + sofaW - 9} y2={H} />
      </g>
      {/* the shared hanging line, labelled clear of the frames */}
      <line x1="0" y1={H - CENTRE} x2={W} y2={H - CENTRE} stroke={soft} strokeWidth="0.4" strokeDasharray="2 3" />
      {frames.map((f) => (
        <g key={f.id}>
          <rect
            x={f.x}
            y={f.y}
            width={f.cm}
            height={f.cm}
            fill="rgb(237 230 214 / 0.05)"
            stroke="rgb(201 120 68 / 0.95)"
            strokeWidth="1"
          />
          <rect x={f.x + 3.5} y={f.y + 3.5} width={f.cm - 7} height={f.cm - 7} fill="none" stroke={soft} strokeWidth="0.4" />
        </g>
      ))}
    </svg>
  );
};

// ── the page ─────────────────────────────────────────────────────────────────

export const Partners = () => {
  // Sticky bar — visible once the masthead has scrolled away, hidden while
  // either form (or the footer) is on screen so there is never a double CTA.
  const heroRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLElement>(null);
  const [pastHero, setPastHero] = useState(false);
  // True while EITHER form, or the footer, is on screen — the three places the
  // bar must stand down. The footer is observed as a whole element rather than
  // measured against scrollHeight on every scroll event: a sentinel stops
  // intersecting the moment it is scrolled past, and a scrollHeight threshold
  // is both a forced reflow per scroll and a guess at the footer's height.
  const [hideZone, setHideZone] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const obs: IntersectionObserver[] = [];
    const hero = heroRef.current;
    if (hero) {
      const o = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0), {
        threshold: 0,
      });
      o.observe(hero);
      obs.push(o);
    }
    const seen = new Map<Element, boolean>();
    const targets = [projectRef.current, introRef.current, footerRef.current].filter(
      (n): n is HTMLElement => Boolean(n),
    );
    if (targets.length) {
      // threshold 0 — "any pixel of this on screen" is exactly the condition;
      // a ratio threshold is unreachable for a section taller than the viewport.
      const o = new IntersectionObserver(
        (entries) => {
          for (const e of entries) seen.set(e.target, e.isIntersecting);
          setHideZone([...seen.values()].some(Boolean));
        },
        { threshold: 0 },
      );
      targets.forEach((t) => o.observe(t));
      obs.push(o);
    }
    return () => obs.forEach((o) => o.disconnect());
  }, []);
  const showSticky = pastHero && !hideZone;

  // ⚠️ window.scrollTo is a NO-OP on these pages (overflow-x-clip on the page
  // root), so every in-page jump must go through scrollIntoView.
  const jump = (el: Element | null | undefined, block: ScrollLogicalPosition = "start") => {
    const smooth =
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block });
  };
  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => jump(ref.current);

  // Suites: every painting with more than one available colourway, as square
  // tiles — the catalogue's real depth, sourced live so it can never drift.
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <Seo
        title="Partners"
        description="Estate-stamped editions of Stephen Meakin's mandalas for hotels, wellness, workplaces, healthcare, restaurants and residential schemes. Tell us the rooms; the family sends a proposal with the works placed on your walls, framed, glazed and delivered free worldwide."
        url="/trade"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: QUESTIONS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <Nav />

      <main className="relative z-10 flex-1">
        {/* ── S1 MASTHEAD ─────────────────────────────────────────────────── */}
        <div ref={heroRef} className={cn(WRAP, "pt-10 md:pt-12 pb-6 md:pb-8")}>
          <Reveal as="div">
            <PageMasthead
              eyebrow="Partners"
              title={
                <>
                  One artist. Every <Em>room</Em>.
                </>
              }
            >
              <div className="mt-4 md:mt-5 border-t border-line pt-4 md:pt-5 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-6 items-end">
                <p
                  className="lg:col-span-8 font-display font-normal tracking-[-0.01em] text-ink m-0 text-balance"
                  style={{
                    fontVariationSettings: '"opsz" 32, "wght" 400',
                    fontSize: "clamp(21px, 2.3vw, 40px)",
                    lineHeight: 1.26,
                    textShadow: "0 1px 2px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.42)",
                  }}
                >
                  Estate-stamped editions of Stephen Meakin's mandalas for hotels, wellness spaces,
                  workplaces, care settings and residential schemes. Tell us the rooms; the family sends
                  a proposal with the works placed on your walls.
                </p>
                <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-3 md:gap-4">
                  <button type="button" onClick={() => scrollTo(projectRef)} className={BTN_PRIMARY}>
                    Send me a proposal
                    <span aria-hidden="true" className="ml-2">→</span>
                  </button>
                  <button type="button" onClick={() => scrollTo(introRef)} className={BTN_SECONDARY}>
                    Bring us a project
                  </button>
                </div>
              </div>
            </PageMasthead>
          </Reveal>
        </div>

        {/* ── S3 ONE PAINTING, EVERY MOOD — same room, same size, five colours. */}
        <section className="py-8 md:py-12">
          <div className={WRAP}>

            <Head sub="Stephen left many of his mandalas in more than one colourway, exactly as he set them. The same work can run down a corridor or across a floor of rooms, each door opening on its own colour, without the scheme coming apart.">
              A corridor of rooms, one <Em>hand</Em>.
            </Head>
          </div>
          {/* The demonstration row: ONE painting, every colourway Stephen set
              for it, at one size. The artwork carries the point — no room. */}
          <div className="flex gap-4 md:gap-5 overflow-x-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-3 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {MOOD_WAYS.map((c, i) => (
              <figure
                key={c.name}
                className="m-0 flex-none w-[74vw] sm:w-[360px] lg:w-[calc((100vw-9rem)/4)] 3xl:w-[calc((100vw-10rem)/5)] snap-start"
              >
                <Link
                  to={`/collections/${MOOD_PAINTING.id}?c=${encodeURIComponent(c.name)}`}
                  className="group block aspect-square overflow-hidden ring-1 ring-line hover:ring-accent/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={`${MOOD_PAINTING.title} — ${c.name}`}
                >
                  <div className="w-full h-full transition-transform duration-700 group-hover:scale-[1.04]">
                    <AssetImage
                      src={c.image}
                      alt={paintingImageAlt(MOOD_PAINTING.title, c.name)}
                      loading={i === 0 ? "eager" : "lazy"}
                      sizes="(min-width:1700px) 19vw, (min-width:1024px) 24vw, 74vw"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
                <figcaption className={cn(META, "mt-3 text-center")}>{c.name}</figcaption>
              </figure>
            ))}
          </div>
          <p className={cn(WRAP, META, "mt-2 text-center")}>
            {MOOD_PAINTING.title} · {MOOD_WAYS.length} colourways, one geometry
          </p>

          {/* Suites — every painting with more than one colourway, dense. */}
          <div className={cn(WRAP, "mt-10 md:mt-14")}>
            {/* EVERY tile on this page is the same square, whichever painting it
                belongs to. The first cut let each group FLEX-GROW to fill its
                row, so a row holding one four-colourway work drew tiles half as
                big again as the row beneath it — the "design isn't consistent"
                failure Hugo catches every time. Each group is now sized to
                exactly its own tile count (`--tile` wide plus the gaps between)
                and never stretched; rows are centred so the ragged right edge
                reads as deliberate. `maxWidth:100%` lets a five-tile group
                shrink on a phone rather than push the page sideways. */}
            <div className="flex flex-wrap justify-center gap-x-8 lg:gap-x-10 gap-y-10">
              {SUITES.map(({ painting, ways }) => (
                <div
                  key={painting.id}
                  className="min-w-0"
                  style={{
                    flex: "0 1 auto",
                    // Sized to its OWN tile count, never stretched — the tile
                    // edge is identical in every group on the page. Written
                    // out rather than via a Tailwind arbitrary custom property
                    // (`[--tile:clamp(…)]` did not apply, and the groups then
                    // sized to content, which is the bug this replaces).
                    width: `calc(${ways.length} * ${TILE} + ${ways.length - 1} * ${TILE_GAP})`,
                    maxWidth: "100%",
                  }}
                >
                 <Reveal as="div">
                  <div
                    className="grid"
                    style={{ gap: TILE_GAP, gridTemplateColumns: `repeat(${ways.length}, minmax(0, 1fr))` }}
                  >
                    {ways.map((c) => (
                      <Link
                        key={c.name}
                        to={`/collections/${painting.id}?c=${encodeURIComponent(c.name)}`}
                        className="group block aspect-square overflow-hidden ring-1 ring-line hover:ring-accent/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label={`${painting.title} — ${c.name}`}
                      >
                        <div className="w-full h-full transition-transform duration-700 group-hover:scale-[1.04]">
                          <AssetImage
                            src={c.image}
                            alt={paintingImageAlt(painting.title, c.name)}
                            loading="lazy"
                            sizes={TILE}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                  {/* Title + count only. Listing every colourway NAME here made
                      the caption wider than its own group, so it wrapped to
                      three ragged lines under the narrow groups and collided
                      with the neighbour. The names belong on the product page
                      and the specification sheet, not under a thumbnail. */}
                  <h3 className="font-display font-semibold tracking-[-0.02em] text-ink m-0 mt-3 text-[clamp(15px,1.05vw,22px)] leading-[1.2] text-balance">
                    {painting.title}
                  </h3>
                  <p className={cn(META, "m-0 mt-0.5")}>{ways.length} colourways</p>
                 </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── S4 THE ROOM LEDGER — every sector at once, in type. ─────────── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>
          <Head sub="The same catalogue answers six different briefs. Find your row — the rooms it usually fills, the sizes that suit them, and what the estate would actually do.">
            What we do for <Em>your</Em> rooms.
          </Head>

          {/* Column headers: desktop only — on a phone each row becomes a
              stacked block that labels its own fields. */}
          <Reveal as="div" className="hidden lg:grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,0.5fr)_minmax(0,2.1fr)] gap-x-8 xl:gap-x-12 border-b border-line pb-3">
            {["Sector", "The rooms", "Sizes", "What the estate does"].map((h) => (
              <p key={h} className={cn(EYEBROW_TIGHT, "m-0")}>
                {h}
              </p>
            ))}
          </Reveal>

          <ul className="list-none m-0 p-0">
            {SECTOR_ROWS.map((r, i) => (
              <li key={r.label} className="m-0 border-t border-line first:border-t-0 lg:first:border-t">
                <Reveal
                  as="div"
                  delay={i * 0.04}
                  className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,0.5fr)_minmax(0,2.1fr)] gap-x-8 xl:gap-x-12 gap-y-3 lg:items-baseline py-6 md:py-7 3xl:py-9"
                >
                  <h3
                    className="font-display font-semibold tracking-[-0.03em] text-ink m-0 text-balance max-w-[15ch] text-[clamp(24px,2.05vw,44px)] leading-[1.08]"
                    style={{ fontVariationSettings: '"opsz" 40, "wght" 600' }}
                  >
                    {r.label}
                  </h3>

                  {/* Phone: the two spec fields get their own labels, since the
                      column headers above are desktop-only. */}
                  <p className={cn(META, "m-0 text-ink")}>
                    <span className="lg:hidden text-ink-muted">Rooms · </span>
                    {r.rooms}
                  </p>
                  <p className={cn(META, "m-0 text-ink lg:whitespace-nowrap")}>
                    <span className="lg:hidden text-ink-muted">Sizes · </span>
                    {r.sizes}
                  </p>
                  <p className="font-sans text-ink-muted m-0 text-[clamp(17px,0.95vw+5px,30px)] leading-[1.5]">
                    {r.does}
                  </p>
                </Reveal>
              </li>
            ))}
          </ul>

          {/* The one sector-specific claim worth promoting out of a row: a
              documented fact, not a picture chosen on a hunch. Verbatim from
              content.ts ABOUT.legacy. */}
          <Reveal as="div" className="border-t border-line pt-6 md:pt-8">
            <p
              className="font-display italic font-normal text-accent m-0 text-[clamp(20px,1.6vw,34px)] leading-[1.35] text-balance"
              style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}
            >
              Stephen's Tree of Wellbeing mandala was distributed to children in 1,200 hospices and
              hospitals throughout the UK.
            </p>
            <div className="mt-7 md:mt-9">
              <button type="button" onClick={() => scrollTo(projectRef)} className={BTN_PRIMARY}>
                Send me a proposal
                <span aria-hidden="true" className="ml-2">→</span>
              </button>
            </div>
          </Reveal>
        </section>

        {/* ── S5 WHAT THE ESTATE PROVIDES ─────────────────────────────────── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>

          <Reveal as="div" className="mb-8 md:mb-10">
            <h2 className={cn(TITLE, "m-0 max-w-[22ch]")}>
              You bring the rooms. The estate does the <Em>rest</Em>.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 border-t border-line">
            {PROVIDES.map((p) => (
              <Reveal
                as="div"
                key={p.title}
                className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-x-8 gap-y-2 py-5 md:py-6 border-b border-line"
              >
                <h3 className="font-display font-semibold tracking-[-0.02em] text-ink m-0 text-[clamp(19px,1.5vw,30px)] leading-[1.15]">
                  {p.title}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none m-0")}>{p.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── S6 THE HAND-PAINTED PIECE ───────────────────────────────────
            The copy sits on one centred measure and the film runs FULL-BLEED
            beneath it. It used to be a 12-column split — copy left, a tall 3/4
            portrait right — and that is precisely the shape Hugo kept calling
            gappy: two columns of wildly different height leave a void beside
            the shorter one at every width, and the taller the media the worse
            it gets. One column of text over one full-width piece of film has
            no second column to be out of step with. ⚠️ The film is original,
            unpublished footage of the Black Rose being drawn at wall scale —
            it appears nowhere else on the site (Hugo, 2026-09-03: "use an
            original video not seen on site totally different"). */}
        <section className="py-8 md:py-12">
          <div className={cn(WRAP, "max-w-[820px] 3xl:max-w-[980px] text-center")}>
            <Reveal as="div">
              <h2 className={cn(TITLE, "m-0 mx-auto")}>
                For the feature wall, his sister still paints by <Em>hand</Em>.
              </h2>
              <p className={cn(SUBTITLE, "m-0 mt-5 md:mt-6 mx-auto max-w-[62ch]")}>
                The estate undertakes a small number of commissions each year, hand-painted by Polly,
                Stephen's sister, working in his sacred-geometry tradition. Scale, palette and timeline
                are agreed with you from the outset, and lead times are confirmed before any commitment.
              </p>
              <p className={cn(SUBTITLE, "m-0 mt-4 mx-auto max-w-[62ch]")}>
                Alongside a commission, the same scheme can carry a run of estate-stamped editions in
                colourways chosen to sit with it, so one room holds the piece and the rest of the
                building answers it.
              </p>
            </Reveal>
          </div>

          <Reveal as="figure" className="m-0 mt-10 md:mt-14">
            <div className="relative w-full overflow-hidden aspect-[16/9] max-h-[76svh]">
              <video
                className="absolute inset-0 w-full h-full object-cover"
                poster={asset("/video/poster-black-rose-wall-v1.jpg")}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                aria-label="A mandala being drawn by hand at wall scale"
              >
                <source src={asset("/video/black-rose-wall-v1.webm")} type="video/webm" />
                <source src={asset("/video/black-rose-wall-v1.mp4")} type="video/mp4" />
              </video>
            </div>
            <figcaption className={cn(META, WRAP, "mt-4 text-center")}>
              The Black Rose, drawn by hand at wall scale
            </figcaption>
          </Reveal>
        </section>

        {/* ── S7 HOW A PROJECT RUNS ───────────────────────────────────────── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>
          <Head sub="Four steps, one point of contact, and nothing to sign before you have seen the work on your own walls.">
            How a project <Em>runs</Em>.
          </Head>
          <ol className="list-none m-0 p-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-8 lg:gap-x-10 gap-y-8">
            {STEPS.map((s, i) => (
              <li key={s.label} className="m-0 xl:border-l xl:border-line xl:pl-6 first:xl:border-l-0 first:xl:pl-0">
               <Reveal as="div" delay={i * 0.06}>
                <p
                  className="font-display italic font-normal text-accent m-0 text-[clamp(22px,2vw,36px)] leading-none"
                  style={ITALIC_STYLE}
                >
                  {s.label}
                </p>
                <h3 className="font-display font-semibold tracking-[-0.02em] text-ink m-0 mt-4 text-[clamp(20px,1.6vw,30px)] leading-[1.15]">
                  {s.title}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none mt-3")}>{s.body}</p>
               </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* ── S8 SCALE ────────────────────────────────────────────────────── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>

          <Head sub="A3 for a pair beside a bed. A2 above a console or a desk. A1 over a sofa, in a lobby or at the end of a corridor. Larger still, by commission. Every size is the same print on the same paper, in the same frame.">
            Three sizes, one <Em>scale</Em>.
          </Head>
          <div>
            <Reveal as="div" className="mx-auto w-full max-w-[900px] 2xl:max-w-[1100px] 3xl:max-w-[1300px]">
              <ScaleDiagram />
              {/* The drawing's labels live here, in real type, for the reason
                  given above the SVG. Same order as the squares, small to large. */}
              <ul className="list-none m-0 mt-5 p-0 flex flex-wrap justify-center gap-x-8 gap-y-2 border-t border-line pt-4">
                {SIZE_LEGEND.map((z) => (
                  <li key={z.id} className="m-0 flex items-baseline gap-2">
                    <span className="font-display font-semibold text-ink text-[clamp(16px,1.1vw,22px)]">
                      {z.label}
                    </span>
                    <span className={cn(META, "m-0")}>{`${z.cm} × ${z.cm} cm`}</span>
                  </li>
                ))}
              </ul>
              <p className={cn(META, "mt-3 text-center")}>
                Drawn to one scale · each hung with its centre 150 cm from the floor · shown against a
                two-metre sofa
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── S9 QUESTIONS ────────────────────────────────────────────────── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>
          <Head>
            Questions people <Em>ask</Em>.
          </Head>
          <div className="grid grid-cols-1 xl:grid-cols-2 items-start gap-x-12 border-t border-line">
            {QUESTIONS.map((f) => (
              <details key={f.q} className="group border-b border-line py-5 md:py-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between gap-6 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm">
                  <h3 className="font-display font-semibold tracking-[-0.02em] text-ink m-0 text-[clamp(18px,1.5vw,28px)] leading-[1.2] group-hover:text-accent transition-colors">
                    {f.q}
                  </h3>
                  <span aria-hidden="true" className="flex-none text-accent text-[26px] 3xl:text-[34px] leading-none transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className={cn(SUBTITLE, "max-w-[68ch] mt-3")}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── S10 REGISTER A PROJECT — the buyer door. ────────────────────── */}
        <section ref={projectRef} id="proposal" className={cn(WRAP, "py-10 md:py-16 scroll-mt-20")}>

          <Head
            sub={
              <>
                Tell us the spaces, the count and the date. A member of the family replies
                personally, with one quotation for the whole scheme. Or write to{" "}
                <a href="mailto:info@themandalacompany.com?subject=Project%20enquiry" className="text-accent hover:underline">
                  info@themandalacompany.com
                </a>
                .
              </>
            }
          >
            Send me a <Em>proposal</Em>.
          </Head>
          <Reveal as="div" className="mx-auto w-full max-w-[1000px] 2xl:max-w-[1160px]">
            <ProjectForm />
          </Reveal>
        </section>

        {/* ── S11 BRING THE ESTATE A PROJECT — the introducer door, quieter. */}
        <section ref={introRef} id="introduce" className={cn(WRAP, "py-10 md:py-16 scroll-mt-20")}>

          <Head sub="Some of Stephen's most important placements began with an introduction: a designer who knew the right wall, a consultant who knew the right client. The estate keeps a small circle of such partners. Bring a project and the family handles everything from selection to delivery. You share in every placement that follows, on terms agreed privately and in writing.">
            Know a wall that needs <Em>this</Em>?
          </Head>
          <Reveal as="ul" className="list-none m-0 p-0 mx-auto max-w-[1000px] 2xl:max-w-[1160px] grid grid-cols-1 sm:grid-cols-3 gap-x-8 border-t border-line">
            {[
              "You introduce.",
              "The family selects, makes, frames and delivers.",
              "You share in the placement, and in the ones that follow.",
            ].map((l) => (
              <li key={l} className={cn(META, "m-0 py-4 text-ink border-b border-line sm:border-b-0")}>
                {l}
              </li>
            ))}
          </Reveal>
          <Reveal as="div" className="mx-auto w-full max-w-[1000px] 2xl:max-w-[1160px] mt-10 md:mt-12">
            <IntroducerForm />
            <p className={cn(META, "m-0 mt-6 text-center")}>
              Already a partner?{" "}
              <Link to="/partners/terms" className="text-accent hover:underline">
                View your terms →
              </Link>
            </p>
          </Reveal>
        </section>

        {/* ── S12 CLOSE — on the artist, in his own words. ────────────────── */}
        <section className={cn(WRAP, "py-10 md:py-16")}>
          <Reveal as="div" className="border-t border-line pt-10 md:pt-14">
           <blockquote className="m-0 max-w-[34ch] mx-auto text-center">
            <p
              className="font-display italic font-normal text-ink m-0 text-[clamp(24px,2.8vw,54px)] leading-[1.2] text-balance"
              style={ITALIC_STYLE}
            >
              “{MEMORIAL_QUOTE.split(". ")[0]}.”
            </p>
            <footer className={cn(EYEBROW_MUTED, "mt-6")}>Stephen Meakin</footer>
           </blockquote>
          </Reveal>
        </section>
      </main>

      {/* ── STICKY BAR — solid (never backdrop-blur on a fixed element). ── */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none",
          showSticky ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none",
        )}
        aria-hidden={!showSticky}
      >
        <div className="border-t border-line bg-bg/95">
          <div className={cn(WRAP, "py-3 flex items-center justify-between gap-4")}>
            <p className={cn(EYEBROW_MUTED, "m-0 hidden sm:block")}>Partners · projects for hotels, wellness, workplace and care</p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button type="button" onClick={() => scrollTo(projectRef)} className={cn(BTN_PRIMARY, "w-full sm:w-auto py-3.5")} tabIndex={showSticky ? 0 : -1}>
                Send me a proposal
                <span aria-hidden="true" className="ml-2">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div ref={footerRef}>
        <Footer />
      </div>
    </div>
  );
};
