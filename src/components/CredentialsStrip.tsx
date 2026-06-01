import { Reveal } from "./Reveal";
import { CREDENTIALS } from "../data/content";
import { EYEBROW_MUTED } from "./ui/tokens";
import { cn } from "../lib/cn";

/**
 * CredentialsStrip — a quiet, documented "Exhibited & commissioned" band.
 * Real, verifiable items only (from CREDENTIALS in content.ts) — text
 * wordmarks, no external logos, never "as seen in". Reusable across pages.
 */
export const CredentialsStrip = () => (
  <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-16">
    <Reveal className="text-center">
      <p className={cn(EYEBROW_MUTED, "m-0 mb-6")}>Exhibited &amp; commissioned</p>
      <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 font-display text-[15px] md:text-[16px] tracking-[0.01em] text-ink/70">
        {CREDENTIALS.map((item, i) => (
          <span key={item} className="inline-flex items-center gap-x-7">
            {i > 0 && <span aria-hidden="true" className="text-ink/30">·</span>}
            <span>{item}</span>
          </span>
        ))}
      </div>
    </Reveal>
  </section>
);
