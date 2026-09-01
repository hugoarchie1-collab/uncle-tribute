import { WALL_PHOTOS } from "../data/wallPhotos";
import { Reveal } from "./Reveal";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED } from "./ui/tokens";
import { asset } from "../lib/asset";

/**
 * WallPhotos — the DROOL "As seen in real homes" band: genuine photos of the
 * prints framed on real walls, the single most persuasive trust element on a
 * print-shop product page.
 *
 * ⚠️ Renders NOTHING until real photos are added to src/data/wallPhotos.ts — no
 * placeholders, no stock, no mockups pretending to be real rooms. That keeps the
 * page honest while the structure sits ready for the estate's photos. Plain
 * <img> (these user-supplied photos won't have webp siblings); lazy + async.
 */
export const WallPhotos = () => {
  if (WALL_PHOTOS.length === 0) return null;

  return (
    <Reveal
      as="section"
      aria-label="The prints on real walls"
      className="mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 mt-10 md:mt-14"
    >
      <div className="h-px w-full bg-line mb-8 md:mb-10" />
      <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>In real homes</p>
      <h2 className="font-display font-semibold tracking-[-0.025em] text-[clamp(26px,3.4vw,44px)] leading-[1.1] text-ink m-0 mb-8">
        On real walls
      </h2>
      <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {WALL_PHOTOS.map((p) => (
          <li key={p.src} className="m-0">
            <figure className="m-0">
              <div className="relative aspect-[4/5] overflow-hidden ring-1 ring-line bg-ink/[0.03]">
                <img
                  src={asset(p.src)}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              {p.caption && (
                <figcaption className="mt-2.5 font-sans text-[13px] 3xl:text-[16px] leading-[1.5] text-ink-muted">
                  {p.caption}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>
    </Reveal>
  );
};
