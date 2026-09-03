import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { AssetImage } from "../components/AssetImage";
import { PageMasthead } from "../components/PageMasthead";
import {
  EYEBROW,
  EYEBROW_MUTED,
  TITLE,
  SUBTITLE,
  META,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from "../components/ui/tokens";
import { cn } from "../lib/cn";
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
 * photograph of a real installed work (the Arista SunStar at Farmacy). Hugo is
 * making the in-room imagery himself; see the note above the artwork helpers.
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
const SectionHead = ({ eyebrow, meta }: { eyebrow: string; meta?: string }) => (
  <Reveal
    as="div"
    className="border-t border-line pt-4 md:pt-5 mb-6 md:mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-2"
  >
    <p className={cn(EYEBROW, "m-0")}>{eyebrow}</p>
    {meta && <p className={cn(EYEBROW_MUTED, "m-0")}>{meta}</p>}
  </Reveal>
);

/** The suite-grid tile edge. Every colourway square on the page is exactly this
 *  wide, in every group, so the grid reads as one set of squares rather than
 *  rows that each chose their own scale. */
const TILE = "clamp(72px, 9vw, 152px)";
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
// remains is the REAL photograph of the Arista SunStar installed at Farmacy —
// a genuine installed commission, not a mock-up. Everything else is the
// painting itself. Do not reintroduce /img/truesize here; when Hugo's own
// room images exist they will arrive under new filenames (the assets are
// cached immutable for a year).

type Art = { src: string; painting: string; colourway: string };

/** Look a painting + colourway up in the catalogue so a path can never rot.
 *  Falls back to the painting's original/first available colourway. */
const art = (paintingId: string, colourwayName?: string): Art => {
  const p = PAINTINGS.find((x) => x.id === paintingId);
  const avail = p?.colourways.filter((c) => c.available) ?? [];
  const c =
    avail.find((x) => x.name === colourwayName) ??
    avail.find((x) => x.isOriginal) ??
    avail[0];
  return { src: c?.image ?? "", painting: p?.title ?? "", colourway: c?.name ?? "" };
};

const ART_HOTEL = art("flower-of-life", "Kaleidoscope");
const ART_WELLNESS = art("slipper-orchids", "Garnet Red");
const ART_WORKPLACE = art("enneagon-swans", "Glacier Blue");
const ART_CARE = art("english-bluebells");
const ART_DINING = art("ophiuchus", "Stained Glass");
const ART_HOME = art("enneagon-swans", "Antique Pink");

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

type Sector = {
  id: string;
  label: string;
  title: ReactNode;
  body: string;
  zones: string[];
  sizes: string;
  art: Art;
};

const SECTORS: Sector[] = [
  {
    id: "hotels",
    label: "Hotels",
    title: (
      <>
        One hand across every <Em>floor</Em>.
      </>
    ),
    body:
      "Bedrooms take a pair at A3 or a single A2 over the headboard. Corridors take a run of one painting in its colourways, so each door opens on its own colour and the building still holds together. The lobby takes an A1, or a piece painted for it. Every print carries a certificate a guest can check.",
    zones: ["Bedrooms", "Corridors", "Suites", "Lobby"],
    sizes: "A3 · A2 · A1 · commission",
    art: ART_HOTEL,
  },
  {
    id: "wellness",
    label: "Wellness & spa",
    title: (
      <>
        The native language of a treatment <Em>room</Em>.
      </>
    ),
    body:
      "Mandalas were made for rooms where people lie still. Calm colourways for the treatment rooms, a warmer one for the lounge, and a single hero piece where guests arrive. Each work comes with its own geometry and its own story for the team to tell.",
    zones: ["Treatment rooms", "Relaxation lounge", "Reception", "Studios"],
    sizes: "A3 · A2 · A1",
    art: ART_WELLNESS,
  },
  {
    id: "workplace",
    label: "Workplace",
    title: (
      <>
        A calmer <Em>floor</Em>.
      </>
    ),
    body:
      "The same artist in every meeting room, each room in its own colourway, so wayfinding and wellbeing come from one decision. Reception takes the largest piece; the certificates give it something to say.",
    zones: ["Reception", "Meeting rooms", "Breakout", "Boardroom"],
    sizes: "A2 · A1",
    art: ART_WORKPLACE,
  },
  {
    id: "healthcare",
    label: "Healthcare & hospices",
    title: (
      <>
        Work that has already been in <Em>care</Em>.
      </>
    ),
    body:
      "Stephen's Tree of Wellbeing mandala was distributed to children in 1,200 hospices and hospitals throughout the UK. The estate continues that work: gentle colourways for family rooms, quiet rooms and staff spaces, chosen with care for patient-facing areas.",
    zones: ["Family rooms", "Quiet rooms", "Staff spaces", "Reception"],
    sizes: "A3 · A2",
    art: ART_CARE,
  },
  {
    id: "dining",
    label: "Restaurants & clubs",
    title: (
      <>
        One piece the room is <Em>known</Em> for.
      </>
    ),
    body:
      "Farmacy in Notting Hill commissioned a 3.6-metre SunStar. For a room that wants a piece of its own, the estate takes on a small number of commissions each year, hand-painted by Polly in Stephen's tradition, alongside a run of framed editions matched to the palette of the room.",
    zones: ["Dining room", "Bar", "Private dining", "Members' lounge"],
    sizes: "A1 · commission",
    art: ART_DINING,
  },
  {
    id: "residential",
    label: "Residential & show homes",
    title: (
      <>
        The show home sells the life. The buyer can take the art <Em>home</Em>.
      </>
    ),
    body:
      "A set that photographs well, framed to fit ordinary walls, delivered on a date. Every print is traceable in the Estate Registry, so the piece on the show-home wall is the same piece a buyer can order for their own.",
    zones: ["Living room", "Bedroom", "Hallway", "Amenity lounge"],
    sizes: "A3 · A2 · A1",
    art: ART_HOME,
  },
];

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
    body: "Solid oak, white or black frames, a white conservation mount and float glass. Canvas as an option. Nothing arrives unframed.",
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
    title: "The works placed on your walls, usually within two working days.",
    body: "Sized true, with one quotation for the whole scheme, held in confidence for your studio.",
  },
  {
    label: "Approve",
    title: "Change colourways, sizes or frames as often as you need.",
    body: "If it helps, one framed proof piece can come first and be credited against the project.",
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
    a: "Yes. A framed proof can be arranged and credited against the project.",
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
const SIZES = ["A3", "A2", "A1", "Larger or hand-painted", "Canvas", "Not sure"] as const;
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
  "inline-flex items-center min-h-[40px] 3xl:min-h-[48px] px-4 3xl:px-5 rounded-full ring-1 ring-line font-sans text-[14px] 2xl:text-[15px] 3xl:text-[18px] 4xl:text-[20px] text-ink-muted cursor-pointer select-none transition-colors hover:ring-accent/60 hover:text-ink has-[:checked]:ring-accent has-[:checked]:text-ink has-[:checked]:bg-accent/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent";

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

const ProjectForm = ({ sector }: { sector: string }) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // The sector selector above the form seeds this field, but ONLY until the
  // buyer answers it themselves. It used to be `key={sector} defaultValue`,
  // which remounted the select on every tab click and silently overwrote their
  // answer. Derived during render (not synced in an effect) so there is no
  // cascading re-render: null means "nobody has touched it, follow the tabs".
  const [ownSector, setOwnSector] = useState<string | null>(null);
  const sectorValue = ownSector ?? sector;
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
            value={sectorValue}
            onChange={(e) => setOwnSector(e.target.value)}
            className={cn(FIELD_INPUT, "appearance-none")}
          >
            <option value="">Select…</option>
            {SECTORS.map((s) => (
              <option key={s.id} value={s.label}>{s.label}</option>
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
  const SANS = "Schibsted Grotesk, sans-serif";
  const stroke = "rgb(237 230 214 / 0.5)";
  const soft = "rgb(237 230 214 / 0.26)";
  return (
    <svg
      viewBox={`0 0 ${W} ${H + 4}`}
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
          <text
            x={f.x + f.cm / 2}
            y={f.y - 5}
            textAnchor="middle"
            fill="#ede6d6"
            fontSize="8.5"
            fontWeight="600"
            fontFamily="Fraunces, serif"
          >
            {f.label}
          </text>
          <text x={f.x + f.cm / 2} y={f.y + f.cm + 9} textAnchor="middle" fill={stroke} fontSize="5.4" fontFamily={SANS}>
            {`${f.cm} × ${f.cm} cm`}
          </text>
        </g>
      ))}
    </svg>
  );
};

// ── the page ─────────────────────────────────────────────────────────────────

export const Partners = () => {
  // ⚠️ The sector is deep-linkable (?sector=wellness — an introducer can send a
  // buyer straight to their own setting) but it is NOT router state. The site's
  // ScrollManager (PageTransition.tsx) resets scroll on every `search` change,
  // so a useSearchParams write threw the reader back to the masthead on every
  // tab click. history.replaceState updates the address bar without a router
  // navigation, so the URL stays shareable and the page stays put.
  const [sectorId, setSectorId] = useState(
    () =>
      SECTORS.find((s) => s.id === new URLSearchParams(window.location.search).get("sector"))?.id ??
      SECTORS[0].id,
  );
  const sector = SECTORS.find((s) => s.id === sectorId) ?? SECTORS[0];
  const tabsId = useId();

  const chooseSector = (id: string) => {
    setSectorId(id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("sector", id);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* address-bar sync is a nicety — never break the tab on it */
    }
  };

  const onTabKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = SECTORS.findIndex((s) => s.id === sectorId);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const n = (i + (e.key === "ArrowRight" ? 1 : -1) + SECTORS.length) % SECTORS.length;
      chooseSector(SECTORS[n].id);
      (e.currentTarget.querySelectorAll<HTMLButtonElement>("button[role=tab]")[n])?.focus();
    }
  };

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
              <p className={cn(EYEBROW_MUTED, "m-0 mt-5 md:mt-6 flex flex-wrap items-center gap-x-3 gap-y-1")}>
                {SECTORS.map((s, i) => (
                  <span key={s.id} className="contents">
                    {i > 0 && (
                      <span aria-hidden="true" className="text-ink/25">
                        ·
                      </span>
                    )}
                    <button
                      type="button"
                      aria-current={s.id === sectorId ? "true" : undefined}
                      onClick={() => {
                        chooseSector(s.id);
                        jump(document.getElementById(`${tabsId}-panel`), "center");
                      }}
                      className={cn(
                        "transition-colors hover:text-accent",
                        s.id === sectorId && "text-accent",
                      )}
                    >
                      {s.label}
                    </button>
                  </span>
                ))}
              </p>
            </PageMasthead>
          </Reveal>
        </div>

        {/* ── S2 ALREADY ON WALLS — the estate's proof, all of it real. ──── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>
          <SectionHead eyebrow="Already on walls" meta="Stephen Meakin · 1966–2021" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-center">
            <Reveal as="figure" className="lg:col-span-6 m-0">
              <div className="overflow-hidden ring-1 ring-line aspect-[16/9]">
                <AssetImage
                  src="/img/welcome/05-arista-sunstar-v3.jpg"
                  alt="The Arista SunStar, Stephen Meakin's 3.6-metre commission for the Farmacy restaurant in Notting Hill"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className={cn(META, "mt-3")}>The Arista SunStar · Farmacy, Notting Hill · 2016</figcaption>
            </Reveal>
            <div className="lg:col-span-6 lg:border-l lg:border-line lg:pl-10 3xl:pl-14">
              {[
                {
                  fig: "3.6 m",
                  text: "The Arista SunStar, commissioned by Camilla Fayed for the Farmacy restaurant in Notting Hill, London.",
                },
                {
                  fig: "F1",
                  text: "The sacred geometry designed for the Sahara Force India Formula 1 car.",
                },
                {
                  fig: "1,200",
                  text: "Hospices and hospitals throughout the UK where the Tree of Wellbeing mandala was distributed to children.",
                },
              ].map((c, i) => (
                <Reveal
                  as="div"
                  key={c.fig}
                  className={cn("grid grid-cols-[auto_1fr] gap-x-6 md:gap-x-8 items-baseline py-5 md:py-6", i > 0 && "border-t border-line")}
                >
                  <p
                    className="font-display font-semibold tracking-[-0.03em] text-ink m-0 text-[clamp(34px,3.6vw,64px)] leading-none whitespace-nowrap min-w-[3.2ch] [font-variant-numeric:tabular-nums]"
                    style={{ fontVariationSettings: '"opsz" 40, "wght" 600' }}
                  >
                    {c.fig}
                  </p>
                  <p className={cn(SUBTITLE, "max-w-none m-0")}>{c.text}</p>
                </Reveal>
              ))}
              <Reveal as="div" className="pt-5 md:pt-6 border-t border-line">
                <p className={cn(META, "m-0")}>
                  Exhibited at the Majlis Gallery, Dubai · Trinity Gallery, London · Unique Arts, Brighton
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── S3 ONE PAINTING, EVERY MOOD — same room, same size, five colours. */}
        <section className="py-8 md:py-12">
          <div className={WRAP}>
            <SectionHead eyebrow="One painting, every mood" meta="Every colourway Stephen set for it" />
            <Reveal as="div" className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-4 items-end mb-6 md:mb-8">
              <h2 className={cn(TITLE, "lg:col-span-7 m-0")}>
                A corridor of rooms, one <Em>hand</Em>.
              </h2>
              <p className={cn(SUBTITLE, "lg:col-span-5 m-0")}>
                Stephen left many of his mandalas in more than one colourway, exactly as he set them. The
                same work can run down a corridor or across a floor of rooms, each door opening on its own
                colour, without the scheme coming apart.
              </p>
            </Reveal>
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

        {/* ── S4 WHERE THE WORK GOES — sector selector. ───────────────────── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>
          <SectionHead eyebrow="Where the work goes" meta="Choose your setting" />
          <div
            role="tablist"
            aria-label="Sector"
            onKeyDown={onTabKey}
            className="flex gap-x-6 md:gap-x-8 3xl:gap-x-10 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-line mb-8 md:mb-10"
          >
            {SECTORS.map((s) => {
              const active = s.id === sectorId;
              return (
                <button
                  key={s.id}
                  role="tab"
                  id={`${tabsId}-tab-${s.id}`}
                  aria-selected={active}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={active ? 0 : -1}
                  type="button"
                  onClick={() => chooseSector(s.id)}
                  className={cn(
                    "relative flex-none pb-3 md:pb-4 font-display font-semibold tracking-[-0.015em] text-[clamp(17px,1.5vw,30px)] whitespace-nowrap transition-colors focus:outline-none focus-visible:text-accent",
                    active ? "text-accent" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {s.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-0 right-0 -bottom-px h-px transition-opacity duration-300",
                      active ? "bg-accent opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              );
            })}
          </div>
          <div
            id={`${tabsId}-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsId}-tab-${sector.id}`}
            className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-center"
          >
            <figure key={sector.id} className="lg:col-span-5 m-0 motion-safe:animate-[fadeIn_0.5s_ease-out]">
              <div className="overflow-hidden ring-1 ring-line aspect-square">
                <AssetImage
                  src={sector.art.src}
                  alt={paintingImageAlt(sector.art.painting, sector.art.colourway)}
                  loading="lazy"
                  sizes="(min-width:1024px) 40vw, 92vw"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className={cn(META, "mt-3")}>
                {sector.art.painting}
                {sector.art.colourway ? ` · ${sector.art.colourway}` : ""}
              </figcaption>
            </figure>
            <div key={sector.id} className="lg:col-span-7 motion-safe:animate-[fadeIn_0.5s_ease-out]">
              <h2 className={cn(TITLE, "m-0 text-[clamp(30px,3.4vw,72px)]")}>{sector.title}</h2>
              <p className={cn(SUBTITLE, "m-0 mt-5 md:mt-6")}>{sector.body}</p>
              <dl className="m-0 mt-6 md:mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-5">
                <dt className={cn(EYEBROW_MUTED, "m-0")}>Suits</dt>
                <dd className={cn(META, "m-0 text-ink")}>{sector.zones.join(" · ")}</dd>
                <dt className={cn(EYEBROW_MUTED, "m-0")}>Sizes</dt>
                <dd className={cn(META, "m-0 text-ink")}>{sector.sizes}</dd>
              </dl>
              <button type="button" onClick={() => scrollTo(projectRef)} className={cn(BTN_PRIMARY, "mt-7 md:mt-8")}>
                Send me a proposal for a {sector.label.toLowerCase()} scheme
                <span aria-hidden="true" className="ml-2">→</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── S5 WHAT THE ESTATE PROVIDES ─────────────────────────────────── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>
          <SectionHead eyebrow="What the estate provides" meta="Carried by the family, end to end" />
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

        {/* ── S6 THE HAND-PAINTED PIECE ───────────────────────────────────── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>
          <SectionHead eyebrow="The hand-painted piece" meta="A small number each year" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-center">
            <Reveal as="div" className="lg:col-span-7 order-2 lg:order-1">
              <h2 className={cn(TITLE, "m-0")}>
                For the feature wall, his sister still paints by <Em>hand</Em>.
              </h2>
              {/* This section sells POLLY's hand. It used to open with a
                  borrowed paragraph of Stephen's bio, so the line under
                  "his SISTER still paints by hand" began "As a skilful
                  practitioner of Sacred Geometry, HIS artworks amplify…" —
                  two different referents for "his" in consecutive sentences,
                  in the one place the reader needs to know whose hand is
                  meant. The commission paragraph says everything the section
                  needs on its own. */}
              <p className={cn(SUBTITLE, "m-0 mt-5 md:mt-6")}>
                The estate undertakes a small number of commissions each year, hand-painted by Polly,
                Stephen's sister, working in his sacred-geometry tradition. Scale, palette and timeline
                are agreed with you from the outset, and lead times are confirmed before any commitment.
              </p>
              <p className={cn(SUBTITLE, "m-0 mt-4")}>
                Alongside a commission, the same scheme can carry a run of estate-stamped editions in
                colourways chosen to sit with it, so one room holds the piece and the rest of the
                building answers it.
              </p>
            </Reveal>
            <Reveal as="figure" className="lg:col-span-5 order-1 lg:order-2 m-0">
              <div className="overflow-hidden ring-1 ring-line aspect-[3/4]">
                <AssetImage
                  src="/img/welcome/hand-finishing-v1.jpg"
                  alt="Hand-finishing a print in Stephen Meakin's geometric tradition"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className={cn(META, "mt-3")}>Hand-finishing in Stephen's tradition</figcaption>
            </Reveal>
          </div>
        </section>

        {/* ── S7 HOW A PROJECT RUNS ───────────────────────────────────────── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>
          <SectionHead eyebrow="How a project runs" meta="Four steps, one point of contact" />
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
          <SectionHead eyebrow="Sized for the wall" meta="Drawn to one scale" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-center">
            <Reveal as="div" className="lg:col-span-4">
              <h2 className={cn(TITLE, "m-0 text-[clamp(30px,3.4vw,72px)]")}>
                Three sizes, one <Em>scale</Em>.
              </h2>
              <p className={cn(SUBTITLE, "m-0 mt-5 md:mt-6")}>
                A3 for a pair beside a bed. A2 above a console or a desk. A1 over a sofa, in a lobby or at
                the end of a corridor. Larger still, by commission. Every size is the same print on the
                same paper, in the same frame.
              </p>
            </Reveal>
            <Reveal as="div" className="lg:col-span-8">
              <ScaleDiagram />
              <p className={cn(META, "mt-4 text-center")}>
                Drawn to one scale · each hung with its centre 150 cm from the floor · shown against a
                two-metre sofa
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── S9 QUESTIONS ────────────────────────────────────────────────── */}
        <section className={cn(WRAP, "py-8 md:py-12")}>
          <SectionHead eyebrow="Questions people ask" meta="Before you write" />
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
          <SectionHead eyebrow="Tell us about the space" meta="One form, one reply, from a person" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-start">
            <Reveal as="div" className="lg:col-span-4">
              <h2 className={cn(TITLE, "m-0")}>
                Send me a <Em>proposal</Em>.
              </h2>
              <p className={cn(SUBTITLE, "m-0 mt-5 md:mt-6")}>
                Tell us the spaces, the count and the date. A member of the family replies personally,
                usually within two working days, with the works placed on your walls and one quotation
                for the scheme.
              </p>
              <p className={cn(META, "m-0 mt-6")}>
                Or write to{" "}
                <a href="mailto:info@themandalacompany.com?subject=Project%20enquiry" className="text-accent hover:underline">
                  info@themandalacompany.com
                </a>
              </p>
            </Reveal>
            <Reveal as="div" className="lg:col-span-8">
              <ProjectForm sector={sector.label} />
            </Reveal>
          </div>
        </section>

        {/* ── S11 BRING THE ESTATE A PROJECT — the introducer door, quieter. */}
        <section ref={introRef} id="introduce" className={cn(WRAP, "py-10 md:py-16 scroll-mt-20")}>
          <SectionHead eyebrow="Bring the estate a project" meta="By invitation · a small circle" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-start">
            <Reveal as="div" className="lg:col-span-5">
              <h2 className={cn(TITLE, "m-0 text-[clamp(30px,3.4vw,72px)]")}>
                Know a wall that needs <Em>this</Em>?
              </h2>
              <p className={cn(SUBTITLE, "m-0 mt-5 md:mt-6")}>
                Some of Stephen's most important placements began with an introduction: a designer who
                knew the right wall, a consultant who knew the right client. The estate keeps a small
                circle of such partners. Bring a project and the family handles everything from
                selection to delivery. You share in every placement that follows, on terms agreed
                privately and in writing.
              </p>
              <ul className="list-none m-0 mt-6 p-0 border-t border-line">
                {[
                  "You introduce.",
                  "The family selects, makes, frames and delivers.",
                  "You share in the placement, and in the ones that follow.",
                ].map((l) => (
                  <li key={l} className={cn(META, "m-0 py-3 border-b border-line text-ink")}>
                    {l}
                  </li>
                ))}
              </ul>
              <p className={cn(META, "m-0 mt-5")}>
                Already a partner?{" "}
                <Link to="/partners/terms" className="text-accent hover:underline">
                  View your terms →
                </Link>
              </p>
            </Reveal>
            <Reveal as="div" className="lg:col-span-7">
              <IntroducerForm />
            </Reveal>
          </div>
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
            <p className={cn(EYEBROW_MUTED, "m-0 hidden sm:block")}>Partners · a proposal with the works on your walls</p>
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
