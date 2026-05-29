import { Footer } from "../components/Footer";
import { IntroFilmHeader } from "../components/IntroFilmHeader";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, EYEBROW_MUTED } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { asset } from "../lib/asset";
import { PHOTOBOOK } from "../data/photobook";
import { TRIBUTE } from "../data/content";

/** Canonical body paragraph recipe — matches About.tsx's reading register. */
const BODY =
  "font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink/85 m-0";

/**
 * /photo-book — "Steve's Photo Book by Polly Wedge". A gallery of personal
 * photographs of Stephen through the years, from the photo book Polly made.
 * Reads only from src/data/photobook.ts (empty until the photos are added),
 * with a dignified coming-soon state in the meantime.
 *
 * Plain lazy <img> (not AssetImage) so screenshots in any format render with
 * no WebP-sibling assumption. Register matches the quieter routed pages.
 */
export const PhotoBook = () => {
  const photos = PHOTOBOOK;

  return (
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title="Steve's Photo Book"
        description="Steve's Photo Book by Polly Wedge — personal photographs of Stephen Meakin through the years, from the family's own album."
        url="/photo-book"
      />
      <IntroFilmHeader />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1100px] px-4 sm:px-6 md:px-8 lg:px-12 py-24 md:py-32">
        <Reveal as="header" className="mb-12 max-w-[720px]">
          <p className={cn(EYEBROW, "m-0 mb-5")}>Photo Book</p>
          <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,6vw,64px)] leading-[1.05] text-ink m-0">
            Steve's Photo Book
          </h1>
          <p className={cn(EYEBROW_MUTED, "mt-5")}>by Polly Wedge</p>
          <p className="font-sans font-normal text-[16px] sm:text-[17px] leading-[1.75] text-ink/75 mt-7 m-0">
            A few pages from the photo book the family keeps — Steve through the
            years, away from the easel: the parties, the late-night skies, the
            small moments in between the work.
          </p>
          <Separator className="bg-ink/15 mt-10" />
        </Reveal>

        {/* IN LOVING MEMORY — Polly Wedge's funeral tribute opens the book.
            Reproduced VERBATIM from src/data/content.ts (TRIBUTE) — four phrases
            are kept exactly as written, pending Polly's confirmation. */}
        <Reveal as="section" className="mb-16 md:mb-20" aria-label="In loving memory">
          <div className="text-center mb-9 md:mb-12">
            <p className={cn(EYEBROW, "m-0 mb-4")}>{TRIBUTE.eyebrow}</p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(30px,4vw,48px)] leading-[1.05] text-ink m-0">
              Stephen, we will love you forever.
            </h2>
          </div>
          <div className="max-w-[720px] mx-auto">
            {TRIBUTE.paragraphs.map((p, i) => (
              <p key={i} className={cn(BODY, i > 0 && "mt-5")}>
                {p}
              </p>
            ))}
            <p className={cn(EYEBROW_MUTED, "mt-8")}>{TRIBUTE.attribution}</p>
          </div>
          <Separator className="bg-ink/15 mt-14 md:mt-16" />
        </Reveal>

        {photos.length > 0 ? (
          <Reveal as="section" className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-5">
            {photos.map((photo, i) => (
              <figure
                key={`${photo.src}-${i}`}
                className="break-inside-avoid mb-4 md:mb-5"
              >
                <img
                  src={asset(photo.src)}
                  alt={photo.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto rounded-sm ring-1 ring-white/10"
                />
                {(photo.caption || photo.year) && (
                  <figcaption className="mt-2 font-sans text-[12.5px] leading-[1.5] text-ink/55">
                    {photo.caption}
                    {photo.caption && photo.year ? " · " : ""}
                    {photo.year && <span className="text-ink/40">{photo.year}</span>}
                  </figcaption>
                )}
              </figure>
            ))}
          </Reveal>
        ) : (
          <Reveal as="section" className="py-6">
            <p className="font-display italic text-[20px] sm:text-[22px] leading-[1.5] text-ink/70 m-0 max-w-[560px]">
              Polly is gathering Steve's photo book — photographs through the
              years, coming here soon.
            </p>
          </Reveal>
        )}
      </main>
      <Footer />
    </div>
  );
};
