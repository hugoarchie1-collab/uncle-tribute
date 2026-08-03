import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { AssetImage } from "../components/AssetImage";
import { WishlistButton } from "../components/WishlistButton";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_MUTED, SUBTITLE, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { useCurrency } from "../lib/currency";
import { useWishlist } from "../lib/wishlist";
import { addItem } from "../lib/basket";
import { PAINTINGS, getAnchorTier, getTierAdvertisedPricePence } from "../data/paintings";

/**
 * /wishlist — the visitor's saved pieces (localStorage, cross-tab synced). Each
 * card shows the exact saved colourway, its "from" price, a heart to remove, an
 * add-to-basket, and a link to the product. Graceful empty state. Private-ish
 * (indexable is fine — it's empty for crawlers), no email/account required.
 */

export const Wishlist = () => {
  const items = useWishlist();
  const { formatPretty: fmtP } = useCurrency();

  const cards = useMemo(
    () =>
      items
        .map((it) => {
          const p = PAINTINGS.find((x) => x.id === it.paintingId);
          if (!p) return null;
          const cw = p.colourways.find((c) => c.available && c.name === it.colourwayName);
          if (!cw) return null;
          return { painting: p, colourway: cw };
        })
        .filter((x): x is { painting: (typeof PAINTINGS)[number]; colourway: (typeof PAINTINGS)[number]["colourways"][number] } => Boolean(x)),
    [items],
  );

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(140% 95% at 50% -12%, rgba(201,120,68,0.16), rgba(10,9,8,0) 52%)",
            "linear-gradient(180deg, #0c0a09 0%, #0a0908 42%, #080706 100%)",
          ].join(","),
        }}
      />
      <Seo
        title="Your saved pieces"
        description="The Stephen Meakin prints you've saved — estate-stamped, hand-framed and made to order."
        url="/wishlist"
      />
      <Nav />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-14 pb-16 md:pb-24">
        <Reveal as="header">
          <p className={cn(EYEBROW, "m-0 mb-6")}>Saved for later</p>
          <h1
            className="font-display font-bold text-ink m-0 text-balance"
            style={{
              fontVariationSettings: '"opsz" 48, "wght" 700',
              fontSize: "clamp(40px, 6vw, 104px)",
              lineHeight: 0.94,
              letterSpacing: "-0.035em",
              textShadow: "0 2px 26px rgba(0,0,0,0.5)",
            }}
          >
            Your <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>saved</em> pieces.
          </h1>
        </Reveal>

        {cards.length === 0 ? (
          <Reveal as="div" className="mt-12 md:mt-16 border-t border-line pt-10 md:pt-14 max-w-[60ch]">
            <h2 className="font-display font-semibold tracking-[-0.03em] text-ink m-0 text-[clamp(26px,3.4vw,46px)] leading-[1.06]">
              Nothing saved yet.
            </h2>
            <p className={cn(SUBTITLE, "max-w-none mt-5")}>
              Tap the heart on any piece to keep it here while you decide — your
              saved prints stay in this browser, ready when you return.
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <Link to="/collections" className={cn(BTN_PRIMARY)}>
                Browse the collection
                <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link to="/print-quiz" className={cn(EYEBROW, "inline-flex items-center gap-2 self-center hover:text-ink transition-colors")}>
                Or take the quiz <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Reveal>
        ) : (
          <section className="mt-12 md:mt-16">
            <p className={cn(EYEBROW_MUTED, "m-0 mb-6")}>
              {cards.length} saved {cards.length === 1 ? "piece" : "pieces"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
              {cards.map(({ painting, colourway }) => {
                const anchor = getAnchorTier(painting);
                return (
                  <Reveal as="figure" key={`${painting.id}-${colourway.name}`} className="m-0">
                    <div className="relative aspect-square overflow-hidden ring-1 ring-line">
                      <WishlistButton paintingId={painting.id} colourwayName={colourway.name} floating />
                      <Link
                        to={`/collections/${painting.id}?c=${encodeURIComponent(colourway.name)}`}
                        className="group block w-full h-full"
                        aria-label={`View ${painting.title}`}
                      >
                        <AssetImage
                          src={colourway.image}
                          alt={`${painting.title} — ${colourway.name}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                      </Link>
                    </div>
                    <figcaption className="pt-4">
                      <h2 className="font-display font-bold text-[clamp(18px,1.3vw,24px)] tracking-[-0.015em] text-ink m-0">
                        {painting.title}
                      </h2>
                      <p className={cn(EYEBROW_MUTED, "m-0 mt-1")}>
                        {colourway.name} · from {fmtP(getTierAdvertisedPricePence(anchor))}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <button
                          type="button"
                          onClick={() => addItem(painting.id, colourway.name, anchor.id, true)}
                          className="font-sans text-[14px] font-semibold text-accent hover:text-ink transition-colors"
                        >
                          Add to basket →
                        </button>
                        <Link
                          to={`/collections/${painting.id}?c=${encodeURIComponent(colourway.name)}`}
                          className="font-sans text-[14px] font-semibold text-ink-muted hover:text-accent transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </figcaption>
                  </Reveal>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};
