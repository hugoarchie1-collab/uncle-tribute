// src/pages/Account.tsx — /account. Passwordless account area (Amazon
// "Hello, sign in / Account & Lists" → your account). Signed-out shows an email
// sign-in form (a one-time link is emailed via /api/auth-request); signed-in
// shows the buyer's order history (GET /api/my-orders) + links to Orders &
// Returns and the Estate Registry. Skinned to the estate (the Auth.tsx /
// Contact masthead pattern). Degrades gracefully when accounts aren't yet
// provisioned (the form still shows; no error tone).

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { useNoindexHead } from "../lib/useNoindexHead";
import { usePageTitle } from "../lib/usePageTitle";
import { Reveal } from "../components/Reveal";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, META, SUBTITLE } from "../components/ui/tokens";
import { MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";
import { useAuth, signOut, requestSignInLink, refreshAuth, type OrderRow } from "../lib/auth";

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const OrderCard = ({ order }: { order: OrderRow }) => (
  <div className="border border-line bg-bg-soft/20 px-5 py-4 sm:px-6 sm:py-5">
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <p className={cn(META, "m-0")}>{formatDate(order.date)}</p>
      <p className="m-0 font-display font-semibold text-[clamp(16px,1.7vw,27px)] text-ink">{order.total}</p>
    </div>
    {order.items.length > 0 && (
      <ul className="mt-3 list-none p-0 m-0 flex flex-col gap-1">
        {order.items.map((it, i) => (
          <li key={i} className={cn(META, "m-0")}>
            {it}
          </li>
        ))}
      </ul>
    )}
    <p className={cn(EYEBROW_TIGHT, "m-0 mt-4 text-accent")}>{order.status}</p>
    <p className={cn(META, "m-0 mt-2 break-all text-ink/80")}>Ref · {order.ref}</p>
  </div>
);

// ─── Avatar uploader ──────────────────────────────────────────────────────────
// Lets anyone set a personal PROFILE PICTURE for this device. The chosen image is
// read in-browser, downscaled to a small SQUARE (centre-cropped) data-URL via a
// canvas, and saved to localStorage under "tasm.avatar". The header (owned by
// another agent) reads the SAME key to show the avatar beside the profile icon.
//
// Privacy-by-design: the image NEVER leaves the device — no upload, no network.
// Robustness: rejects non-images + oversized originals gracefully (a quiet inline
// note, never a thrown error); the ≤256px re-encode keeps localStorage small so a
// large photo can't blow the quota. We dispatch a "storage" event after writing so
// a same-tab header listening for it can update live (the native event only fires
// cross-tab).
const AVATAR_KEY = "tasm.avatar";
const AVATAR_MAX_PX = 256; // output square edge
const AVATAR_MAX_BYTES = 12 * 1024 * 1024; // reject absurd originals (12 MB)

/** Read the persisted avatar data-URL (SSR/quota-safe). */
const readStoredAvatar = (): string | null => {
  try {
    return localStorage.getItem(AVATAR_KEY);
  } catch {
    return null;
  }
};

/** Downscale + centre-crop a File to a square data-URL (JPEG, ≤AVATAR_MAX_PX). */
const fileToSquareDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!side) {
        reject(new Error("empty"));
        return;
      }
      const out = Math.min(AVATAR_MAX_PX, side);
      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("no-canvas"));
        return;
      }
      // Centre-crop the largest square, then scale down into the canvas.
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("encode"));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });

const AvatarUploader = ({ email }: { email: string | null }) => {
  const [avatar, setAvatar] = useState<string | null>(() => readStoredAvatar());
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const persist = (value: string | null) => {
    try {
      if (value) localStorage.setItem(AVATAR_KEY, value);
      else localStorage.removeItem(AVATAR_KEY);
      // Nudge a same-tab header listener (native "storage" only fires cross-tab).
      window.dispatchEvent(new StorageEvent("storage", { key: AVATAR_KEY, newValue: value }));
    } catch {
      // Quota / disabled storage — the in-memory preview still updated.
    }
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so re-choosing the SAME file fires change again.
    e.target.value = "";
    if (!file) return; // cancelled — no-op, no error tone.
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      setNote("That doesn’t look like an image — choose a JPG, PNG or WebP.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setStatus("error");
      setNote("That photo is very large — please choose one under 12 MB.");
      return;
    }
    setStatus("working");
    setNote(null);
    try {
      const dataUrl = await fileToSquareDataUrl(file);
      setAvatar(dataUrl);
      persist(dataUrl);
      setStatus("idle");
    } catch {
      setStatus("error");
      setNote("That image couldn’t be read — try a different photo.");
    }
  };

  const onRemove = () => {
    setAvatar(null);
    persist(null);
    setStatus("idle");
    setNote(null);
  };

  return (
    <div className="flex items-center gap-5">
      {/* The avatar (or a dignified monogram placeholder). */}
      <div className="relative shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt="Your profile picture"
            className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover ring-1 ring-line"
          />
        ) : (
          <div
            aria-hidden
            className="h-16 w-16 md:h-20 md:w-20 rounded-full ring-1 ring-line bg-bg-soft/30 flex items-center justify-center font-display text-[28px] md:text-[32px] text-ink-muted"
          >
            {email?.trim()?.[0]?.toUpperCase() ?? "·"}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className={cn(EYEBROW_MUTED, "m-0 mb-2")}>Profile picture</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === "working"}
            className={cn(EYEBROW_MUTED, "bg-transparent border-0 cursor-pointer hover:text-accent transition-colors disabled:opacity-50")}
          >
            {status === "working" ? "Adding…" : avatar ? "Change photo" : "Add a photo"}
          </button>
          {avatar && (
            <button
              type="button"
              onClick={onRemove}
              className={cn(EYEBROW_MUTED, "bg-transparent border-0 cursor-pointer underline underline-offset-4 hover:text-accent transition-colors")}
            >
              Remove
            </button>
          )}
        </div>
        <p className={cn(META, "m-0 mt-2 max-w-[40ch]")} aria-live="polite">
          {status === "error" && note
            ? note
            : "Your profile picture — it appears beside any memory you share."}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          aria-hidden="true"
          tabIndex={-1}
          className="absolute left-[-9999px] h-px w-px opacity-0"
        />
      </div>
    </div>
  );
};

export const Account = () => {
  const [params] = useSearchParams();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const linkExpired = params.get("error") === "link";

  // Private sign-in page — keep it out of the index (mirrors Basket).
  usePageTitle("Your account");
  useNoindexHead();

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
    <div className="relative min-h-screen flex flex-col overflow-x-clip bg-bg">
      <SceneBackdrop src="/img/scenes/account-scene-v4.webp" />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-14 pb-16 md:pb-24">
        <Reveal as="header">
          <div className="flex items-center gap-4 md:gap-6 border-b border-line pb-3 md:pb-4">
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
            className="font-display text-ink m-0 mt-5 md:mt-6 text-balance text-pretty"
            style={MASTHEAD_TITLE_STYLE}
          >
            {signedIn ? "Your orders." : "Your account."}
          </h1>
        </Reveal>

        <div className="mt-8 md:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-10 items-start border-t border-line pt-8 md:pt-10">
          {/* LEFT — the action (sign-in form OR order history). */}
          <Reveal as="div" className="lg:col-span-7">
            {auth.status === "loading" ? (
              <p className={cn(META, "m-0")}>Checking your session…</p>
            ) : signedIn ? (
              <>
                <p className="font-display font-normal italic text-[clamp(20px,0.72vw_+_15px,31px)] leading-[1.3] text-ink m-0 mb-4">
                  Welcome back — <span className="not-italic text-ink-muted">{auth.email}</span>
                </p>
                {auth.orders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {auth.orders.map((o) => (
                      <OrderCard key={o.ref} order={o} />
                    ))}
                  </div>
                ) : (
                  <p className={cn(SUBTITLE, "m-0 max-w-[64ch]")}>
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
                  <div className="border border-accent/30 bg-bg-soft/30 px-6 py-6 sm:px-8">
                    <span className={EYEBROW}>Check your inbox</span>
                    <p className={cn(SUBTITLE, "m-0 mt-3 max-w-[60ch]")}>
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
                        className="press shrink-0 whitespace-nowrap px-6 md:px-8 font-sans text-[14px] md:text-[13px] font-bold tracking-[0.14em] uppercase text-bg bg-ink hover:bg-accent transition-colors border-0 cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? "Sending…" : "Email me a link"}
                      </button>
                    </div>
                    {formError && <p className={cn(META, "m-0 mt-3 text-accent")}>{formError}</p>}
                    <p className={cn(META, "m-0 mt-3 text-ink-muted max-w-[64ch]")}>
                      No password needed — we email you a secure one-time link. If you've ordered
                      before, your order history appears once you sign in.
                    </p>
                  </form>
                )}
              </>
            )}
          </Reveal>

          {/* RIGHT — profile picture + framing + quick links. Anchored as a
              deliberate hairline rail (the Contact / Trade / Auth convention) so
              the shorter right column reads as an intentional rail beside the
              order history / sign-in, never a floating void. */}
          <Reveal as="div" delay={0.06} className="lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
            <AvatarUploader email={signedIn ? auth.email : null} />
            <p
              className="font-display font-normal tracking-[-0.01em] text-ink m-0 mt-6 md:mt-7 pt-5 md:pt-6 border-t border-line max-w-[40ch]"
              style={{ fontVariationSettings: '"opsz" 32, "wght" 400', fontSize: "clamp(19px, 2.1vw, 28px)", lineHeight: 1.3 }}
            >
              Your account keeps your orders, certificates and provenance in one place.
            </p>
            <ul className="list-none p-0 m-0 mt-5 flex flex-col gap-2.5">
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
