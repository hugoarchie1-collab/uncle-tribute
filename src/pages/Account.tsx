// src/pages/Account.tsx — /account. Passwordless account area (Amazon
// "Hello, sign in / Account & Lists" → your account). Signed-out shows an email
// sign-in form (a one-time link is emailed via /api/auth-request); signed-in
// shows the buyer's order history (GET /api/my-orders) + links to Orders &
// Returns and the Estate Registry. Skinned to the estate (the Auth.tsx /
// Contact masthead pattern). Degrades gracefully when accounts aren't yet
// provisioned (the form still shows; no error tone).

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { Seo } from "../components/Seo";
import { Reveal } from "../components/Reveal";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, META } from "../components/ui/tokens";
import { useAuth, signOut, requestSignInLink, refreshAuth, type OrderRow } from "../lib/auth";

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const OrderCard = ({ order }: { order: OrderRow }) => (
  <div className="border border-line bg-bg-soft/20 px-5 py-5 sm:px-6 sm:py-6">
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <p className={cn(META, "m-0")}>{formatDate(order.date)}</p>
      <p className="m-0 font-display font-semibold text-[18px] text-ink">{order.total}</p>
    </div>
    {order.items.length > 0 && (
      <ul className="mt-3 list-none p-0 m-0 flex flex-col gap-1">
        {order.items.map((it, i) => (
          <li key={i} className="font-sans text-[15px] leading-[1.5] text-ink-soft">
            {it}
          </li>
        ))}
      </ul>
    )}
    <p className={cn(EYEBROW_TIGHT, "m-0 mt-4 text-accent")}>{order.status}</p>
    <p className={cn(META, "m-0 mt-2 break-all text-ink-muted/80")}>Ref · {order.ref}</p>
  </div>
);

export const Account = () => {
  const [params] = useSearchParams();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const linkExpired = params.get("error") === "link";

  // Returning via the magic link lands here with a fresh session cookie — make
  // sure the store reflects it (the lazy initial fetch may have run signed-out).
  useEffect(() => {
    refreshAuth();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setFormError(null);
    const res = await requestSignInLink(email.trim());
    setSubmitting(false);
    if (res.ok) setSent(true);
    else setFormError(res.error ?? "Enter a valid email address.");
  };

  const signedIn = auth.status === "signedIn";

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title="Your account"
        description="Sign in to The Art of Stephen Meakin to view your orders. Passwordless — we email you a secure one-time link."
        url="/account"
      />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-14 pb-12 md:pb-16">
        <Reveal as="header">
          <div className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
            <span className={EYEBROW}>Account</span>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
            {signedIn && (
              <button
                type="button"
                onClick={() => void signOut()}
                className={cn(EYEBROW_MUTED, "shrink-0 hover:text-accent transition-colors")}
              >
                Sign out
              </button>
            )}
          </div>
          <h1
            className="font-display font-bold tracking-[-0.045em] text-ink m-0 mt-4 md:mt-6 leading-[0.9] text-balance"
            style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontSize: "clamp(46px, 9vw, 132px)" }}
          >
            {signedIn ? "Your orders." : "Your account."}
          </h1>
        </Reveal>

        <div className="mt-7 md:mt-9 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-start border-t border-line pt-6 md:pt-8">
          {/* LEFT — the action (sign-in form OR order history). */}
          <Reveal as="div" className="lg:col-span-7">
            {auth.status === "loading" ? (
              <p className={cn(META, "m-0")}>Checking your session…</p>
            ) : signedIn ? (
              <>
                <p className="font-display font-normal italic text-[clamp(20px,2.4vw,30px)] leading-[1.3] text-ink m-0 mb-6">
                  Welcome back — <span className="not-italic text-ink-soft">{auth.email}</span>
                </p>
                {auth.orders.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {auth.orders.map((o) => (
                      <OrderCard key={o.ref} order={o} />
                    ))}
                  </div>
                ) : (
                  <p className="font-sans text-[16px] md:text-[17px] leading-[1.7] text-ink-soft m-0 max-w-[56ch]">
                    No orders are linked to this email yet. When you order a print, it will appear
                    here. You can also{" "}
                    <Link to="/orders" className="underline underline-offset-4 hover:text-accent">
                      track an order by its reference
                    </Link>
                    .
                  </p>
                )}
              </>
            ) : (
              <>
                {sent ? (
                  <div className="border border-accent/30 bg-bg-soft/30 px-6 py-8 sm:px-8">
                    <span className={EYEBROW}>Check your inbox</span>
                    <p className="font-sans text-[16px] md:text-[17px] leading-[1.7] text-ink-soft m-0 mt-4 max-w-[52ch]">
                      If an account exists for <span className="text-ink">{email}</span>, a secure
                      one-time sign-in link is on its way. It's valid for 15 minutes.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} noValidate>
                    {linkExpired && (
                      <p className={cn(META, "m-0 mb-4 text-accent")}>
                        That sign-in link has expired or already been used — request a fresh one
                        below.
                      </p>
                    )}
                    <span className={cn(EYEBROW, "block mb-3")}>Email address</span>
                    <div className="flex w-full items-stretch ring-1 ring-line focus-within:ring-accent transition-shadow">
                      <input
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        aria-label="Email address"
                        autoComplete="email"
                        className="flex-1 min-w-0 bg-transparent px-4 py-3.5 font-sans text-[16px] md:text-[17px] text-ink placeholder:text-ink/30 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="shrink-0 whitespace-nowrap px-5 md:px-7 font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink-muted hover:text-accent transition-colors bg-transparent border-0 border-l border-line cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? "Sending…" : "Email me a link"}
                      </button>
                    </div>
                    {formError && <p className={cn(META, "m-0 mt-3 text-accent")}>{formError}</p>}
                    <p className={cn(META, "m-0 mt-4 text-ink-muted max-w-[52ch]")}>
                      No password needed — we email you a secure one-time link. If you've ordered
                      before, your order history appears once you sign in.
                    </p>
                  </form>
                )}
              </>
            )}
          </Reveal>

          {/* RIGHT — framing + quick links. */}
          <Reveal as="div" delay={0.06} className="lg:col-span-5">
            <p
              className="font-display font-normal tracking-[-0.01em] text-ink m-0 max-w-[34ch]"
              style={{ fontVariationSettings: '"opsz" 32, "wght" 400', fontSize: "clamp(19px, 2.1vw, 28px)", lineHeight: 1.32 }}
            >
              Your account keeps your orders, certificates and provenance in one place.
            </p>
            <ul className="list-none p-0 m-0 mt-6 flex flex-col gap-2.5">
              <li>
                <Link to="/orders" className={cn(META, "hover:text-accent transition-colors")}>
                  Orders &amp; returns →
                </Link>
              </li>
              <li>
                <Link to="/auth" className={cn(META, "hover:text-accent transition-colors")}>
                  Authenticate a certificate →
                </Link>
              </li>
              <li>
                <Link to="/collections" className={cn(META, "hover:text-accent transition-colors")}>
                  Browse the collection →
                </Link>
              </li>
            </ul>
          </Reveal>
        </div>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
