// src/pages/Orders.tsx — /orders. Amazon "Returns & Orders", estate-skinned.
// Two sections: (1) track an order by its reference (the cs_… id from the
// confirmation email) + optional email, via GET /api/order-status; (2) a warm
// returns / after-sale summary that links to the full /returns + /faq policy
// and offers a prefilled return-or-damage email. Signed-in buyers get their
// full history at /account.

import { useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
import { useNoindexHead } from "../lib/useNoindexHead";
import { usePageTitle } from "../lib/usePageTitle";
import { Reveal } from "../components/Reveal";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_TIGHT, META } from "../components/ui/tokens";

interface FoundOrder {
  ref: string;
  date: string | null;
  total: string;
  status: string;
  items: string[];
}
type LookupState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "found"; order: FoundOrder }
  | { state: "missing" }
  | { state: "error" };

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export const Orders = () => {
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<LookupState>({ state: "idle" });

  // Private order-tracking page — keep it out of the index (mirrors Basket).
  usePageTitle("Orders & returns");
  useNoindexHead();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = ref.trim();
    if (!r) return;
    setResult({ state: "loading" });
    try {
      const qs = new URLSearchParams({ ref: r });
      if (email.trim()) qs.set("email", email.trim());
      const resp = await fetch(`/api/order-status?${qs.toString()}`);
      if (!resp.ok) {
        setResult({ state: "error" });
        return;
      }
      const j = (await resp.json()) as { found?: boolean; order?: FoundOrder };
      setResult(j.found && j.order ? { state: "found", order: j.order } : { state: "missing" });
    } catch {
      setResult({ state: "error" });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <SceneBackdrop src="/img/scenes/orders-autumn-scene-v3.webp" />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-12 pb-14 md:pb-20">
        <Reveal>
          <PageMasthead
            eyebrow="Orders & returns"
            meta={
              <Link to="/account" className="hover:text-accent transition-colors">
                Sign in for full history <span aria-hidden="true">→</span>
              </Link>
            }
            title={<>Track an order</>}
          />
        </Reveal>

        <div className="mt-8 md:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-start border-t border-line pt-8 md:pt-10">
          {/* TRACK AN ORDER */}
          <Reveal as="div" className="lg:col-span-7">
            <form onSubmit={onSubmit} noValidate>
              <label htmlFor="orders-ref" className={cn(EYEBROW, "block mb-3")}>Order reference</label>
              <input
                id="orders-ref"
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="cs_live_… (from your confirmation email)"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-transparent px-4 py-3.5 ring-1 ring-line focus:ring-accent focus:outline-none transition-shadow font-sans text-[16px] md:text-[17px] text-ink placeholder:text-ink/45"
              />
              <label htmlFor="orders-email" className={cn(EYEBROW, "block mt-4 mb-3")}>Email on the order (optional)</label>
              <div className="flex w-full items-stretch ring-1 ring-line focus-within:ring-accent transition-shadow">
                <input
                  id="orders-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="flex-1 min-w-0 bg-transparent px-4 py-3.5 font-sans text-[16px] md:text-[17px] text-ink placeholder:text-ink/45 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 whitespace-nowrap px-5 md:px-7 font-sans text-[13px] font-bold tracking-[0.04em] text-ink-muted hover:text-accent transition-colors bg-transparent border-0 border-l border-line cursor-pointer"
                >
                  Track
                </button>
              </div>

              <div aria-live="polite" className="mt-6 md:mt-8 empty:mt-0">
                {result.state === "loading" && <p className={cn(META, "m-0")}>Looking up your order…</p>}
                {result.state === "found" && (
                  <div className="border border-accent/30 bg-bg-soft/30 px-6 py-7 sm:px-8">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line pb-4">
                      <span className={EYEBROW}>{result.order.status}</span>
                      <span className="font-display font-semibold text-[20px] text-ink">{result.order.total}</span>
                    </div>
                    {result.order.items.length > 0 && (
                      <ul className="mt-4 list-none p-0 m-0 flex flex-col gap-1.5">
                        {result.order.items.map((it, i) => (
                          <li key={i} className="font-sans text-[16px] leading-[1.5] text-ink">{it}</li>
                        ))}
                      </ul>
                    )}
                    <p className={cn(META, "m-0 mt-5 pt-4 border-t border-line")}>
                      Ordered {formatDate(result.order.date)}. You'll receive a tracking email the
                      moment it leaves the studio.
                    </p>
                  </div>
                )}
                {result.state === "missing" && (
                  <p className="font-sans text-[16px] leading-[1.7] text-ink-soft m-0 max-w-[52ch]">
                    We couldn't find an order for that reference{email.trim() ? " + email" : ""}.
                    Check the reference from your confirmation email, or write to{" "}
                    <a href="mailto:info@themandalacompany.com" className="underline underline-offset-4 hover:text-accent">
                      info@themandalacompany.com
                    </a>{" "}and we'll find it for you.
                  </p>
                )}
                {result.state === "error" && (
                  <p className={cn(META, "m-0")}>
                    Order tracking is briefly unavailable — please try again in a moment.
                  </p>
                )}
              </div>
            </form>
          </Reveal>

          {/* RETURNS & AFTER-SALE — anchored as a deliberate hairline rail (the
              Contact / Trade / Auth convention) so the shorter right column reads
              as an intentional rail beside the form, never a floating void. */}
          <Reveal as="div" delay={0.06} className="lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
            <p className={cn(EYEBROW_TIGHT, "m-0 mb-3")}>Returns &amp; after-sale</p>
            <p className="font-sans text-[16px] md:text-[17px] leading-[1.7] text-ink-soft m-0 max-w-[40ch]">
              Every print is made to order. The A3 Open Edition carries the full 14-day
              change-of-mind right; if anything arrives less than perfect, we replace or refund it.
              The full policy lives on the{" "}
              <Link to="/returns" className="underline underline-offset-4 hover:text-accent">returns</Link>{" "}
              and{" "}
              <Link to="/faq" className="underline underline-offset-4 hover:text-accent">FAQ</Link>{" "}
              pages.
            </p>
            <a
              href="mailto:info@themandalacompany.com?subject=Return%20or%20damage%20%E2%80%94%20order%20reference"
              className="inline-flex items-center mt-6 px-6 py-3.5 ring-1 ring-line hover:ring-accent hover:text-accent transition-colors font-sans text-[13px] font-bold tracking-[0.04em] text-ink rounded-full"
            >
              Start a return or report damage
            </a>
          </Reveal>
        </div>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
