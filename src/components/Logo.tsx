import { Link } from "react-router-dom";

interface LogoProps {
  size?: number;
  wordmark?: boolean;
  /** Let the wordmark WRAP within its container instead of forcing one line.
   *  Used in the footer 4-col grid, where the column gets narrower than the
   *  one-line wordmark below ~1400px and the nowrap text spilled into the
   *  next ("SITE") column. With this on, the brand box fills its column and
   *  the wordmark breaks cleanly to two lines rather than overlapping. */
  wordmarkWrap?: boolean;
  /** Override the wordmark text. Defaults to the estate name; the top banner
   *  passes "The SEM Experience" while the footer keeps the full name. */
  wordmarkText?: string;
  className?: string;
}

export const Logo = ({
  size = 30,
  wordmark = true,
  wordmarkWrap = false,
  wordmarkText = "The Art of Stephen Meakin",
  className,
}: LogoProps) => {
  // The ROUND "THE MANDALA COMPANY" wax seal (Hugo, 2026-07-22, sent the exact
  // art: "this is the round new updated logo for top left bar… i want this
  // transparent, no checkered background, a visible aesthetic and clear enough").
  // v2 = the seal keyed to FULL transparency (the cream ground is gone); paired
  // with the cream rim-light below it stays visible + crisp on the dark-red nav.
  // Shown symbol-only in the nav (its own ring text IS the wordmark).
  const url = `${import.meta.env.BASE_URL}logo/mandala-company-seal-disc-v2.png`;
  return (
    <div className={`${wordmarkWrap ? "flex w-full" : "inline-flex min-w-0"} items-center gap-3 leading-none ${className ?? ""}`}>
      {/*
        The Mandala Company wax-seal mark — a deep-red 3D Tudor-rose seal whose
        OWN engraved relief is brought out in white (v7, 2026-06-28). Hugo
        rejected v6 (a clean white line-rose composited on top) as "appealing but
        NOT naturally engraved within the wax symbol — it's awful": the flat lines
        read as pasted-on, not part of the wax. v7 instead ENHANCES the seal's
        existing 3D relief — its real raised petal edges catch a white specular
        highlight (the seal's own high-pass ridges + isolated highlights screened
        back, deepened recesses via sigmoidal contrast). v8 (2026-06-28) ADDS a
        clean white RIM-LIGHT around the wax's outer silhouette edge — derived
        from the seal's OWN alpha edge, so it reads as the wax catching light on
        its raised rim, NOT a pasted-on ring — giving Hugo BOTH of his asks at
        once: the "white outline around the rose" that makes it STAND OUT on any
        ground, AND the rose's details in thin white, naturally engraved. So the
        worldwide-recognisable Tudor rose reads from a distance as a ROSE, never a
        flat red disc, while looking like genuine pressed wax. v9 (2026-06-28)
        FIXES the regression that shipped the v8 PNGs flattened onto an OPAQUE
        BLACK square (mean-alpha 1.0 — the "random black box behind the logo"
        Hugo flagged sitewide): a border-bridged corner flood-fill keys that
        black background back to transparent (fuzz 18%, so the dark inter-petal
        crevices — not connected to the border — stay intact), leaving the wax
        rose + its white rim on clean transparency. The seal's feathered alpha is
        preserved untouched.
        Square mark, width === height. Never display:none'd; the wordmark shows at
        EVERY width (wraps to two lines on the smallest phones — Hugo: "add full
        logo with text on mobile too so it's not just the symbol").
      */}
      <img
        src={url}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        decoding="async"
        /* v2 (2026-07-21): the disc is now keyed to full TRANSPARENCY (the cream
           ground Hugo hated is gone), so NO rounded-full clip — a circle would
           slice the ends of the arced "THE MANDALA COMPANY" wordmark. The mark
           floats clean on any ground, like a Nike symbol (Hugo's ask). */
        className="block shrink-0"
        style={{
          width: size,
          height: size,
          // NO cream/white glow (2026-07-22, Hugo: "logo's got this white light I
          // never asked for — I can't read it"). The cream rim-light read as an
          // unwanted white halo. Replaced with a soft DARK depth shadow only, so
          // the deep-red wax seal keeps a little separation on the dark-red nav /
          // near-black footer WITHOUT any white light on it.
          filter:
            "drop-shadow(0 1px 4px rgba(0,0,0,0.7)) drop-shadow(0 0 7px rgba(0,0,0,0.4))",
        }}
      />
      {wordmark && (
        // NAV wordmark sized to MATCH the weight of the deep-red seal beside it
        // (Hugo: the old 16px/normal text read small + un-impactful). In the nav
        // it's bold Fraunces that grows responsively across the screen
        // (clamp 20→28px, opsz 28, semibold). The FOOTER (wordmarkWrap) keeps the
        // original tidy 16px/normal so it still wraps cleanly to two lines inside
        // the narrow brand column — only the header logo gets the big treatment.
        <span
          className={`inline font-display text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.55)] ${wordmarkWrap ? "text-[16px] font-normal tracking-tight min-w-0 whitespace-normal leading-[1.2]" : "text-[clamp(19px,5vw,28px)] font-bold tracking-[-0.015em] whitespace-normal sm:whitespace-nowrap leading-[1.08] min-w-0 max-w-full sm:max-w-none"}`}
          style={wordmarkWrap ? undefined : { fontVariationSettings: '"opsz" 28' }}
        >
          {wordmarkText}
        </span>
      )}
    </div>
  );
};

export const LogoLink = ({ size = 30, wordmark = true }: LogoProps) => (
  <Link to="/" aria-label="The Art of Stephen Meakin — home" className="inline-flex">
    <Logo size={size} wordmark={wordmark} />
  </Link>
);
