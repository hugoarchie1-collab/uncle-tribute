// src/components/SearchBar.tsx — the estate's Amazon-pattern header search,
// skinned to the memorial aesthetic (NOT Amazon's blue/white look).
//
// Amazon is the INFORMATION-ARCHITECTURE reference only: a single rounded
// pill with a leading glyph, a live suggestions dropdown that opens on type,
// keyboard up/down navigation, Enter to go, Escape to close, click-away to
// close, and a footer "search everything" row. Everything else — palette,
// type, motion — is the estate's: near-black surfaces, cream hairlines, the
// rust accent reserved for focus/hover, Fraunces nowhere here (this is UI
// chrome, so Hanken Grotesk throughout), backdrop-blur on the panel.
//
// It draws ONLY from the search contract (src/lib/search.ts): searchSite()
// for results + SEARCH_TYPE_LABELS for the small type tags. It owns no data.
//
// `variant`:
//   "header" — compact, fits the desktop Nav row (this is what the orchestrator
//              wires into Nav.tsx; we never edit Nav ourselves).
//   "page"   — larger, full-width, used at the top of /search to refine.
// `onNavigate` lets the host (e.g. the mobile menu) close itself when the user
// commits to a result, so the same component serves the desktop header AND the
// full-screen mobile drawer.
// `label` names this instance's search landmark + input (two can be on screen
// at once). `initialQuery` seeds AND re-seeds the field — /search passes ?q=.
//
// Every buyer-visible word here comes from SEARCH in src/data/content.ts.

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { searchSite, SEARCH_TYPE_LABELS, type SearchResult } from "../lib/search";
import { AssetImage } from "./AssetImage";
import { SEARCH } from "../data/content";
import { cn } from "../lib/cn";

interface SearchBarProps {
  className?: string;
  /** "header" = compact (desktop Nav / mobile menu); "page" = large (/search). */
  variant?: "header" | "page";
  /**
   * Accessible name for THIS instance — used for both the `role="search"`
   * landmark on the <form> and the combobox input. Two instances can be on
   * screen at once (the header reveal open while /search shows its refine
   * field); without distinct names a screen reader announced two identical,
   * unnamed search landmarks carrying two identically-labelled inputs.
   */
  label?: string;
  /**
   * Seed the field with this text on mount, and RE-seed whenever it changes.
   * /search passes its `?q=` here: arriving by shared link, a refresh or the
   * back button used to leave the big refine field empty under a heading that
   * quoted the query back at you (the field only kept text when you had typed
   * it into that same mounted instance).
   */
  initialQuery?: string;
  /** Called after any navigation commits — lets the host (mobile drawer) close. */
  onNavigate?: () => void;
  /** Focus the input as soon as it mounts — used by the header's search reveal
   *  so the field is ready to type into the instant it opens. */
  autoFocus?: boolean;
  /** Show the voice-search mic. Default FALSE — the mic reads as marketplace
   *  chrome and is dropped in unison across every device (Hugo 2026-08-27); pass
   *  true only to bring it back for a specific surface. */
  showVoice?: boolean;
}

/** Minimal shape of the Web Speech API's SpeechRecognition (this TS lib ships
 *  SpeechRecognitionEvent but not the recognition interface). Only the members
 *  we use are typed. */
type MinimalSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

/** The browse-all door offered when the index has nothing to show — the nav's
 *  OWN "Collections" label and route, never invented recovery copy. */
const BROWSE = SEARCH.links[0];

/** Top results to surface in the live dropdown — the brief's ~7. */
const DROPDOWN_LIMIT = 7;
/** Debounce so we don't re-rank on every keystroke (~120ms per the brief). */
const DEBOUNCE_MS = 120;

const MagnifierIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const SearchBar = ({
  className,
  variant = "header",
  label = SEARCH.landmarkHeader,
  initialQuery = "",
  onNavigate,
  autoFocus = false,
  showVoice = false,
}: SearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery.trim());
  // -1 = nothing highlighted (Enter submits to /search); 0..n highlights a row.
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const statusId = useId();
  const isPage = variant === "page";

  // RE-seed when the host's initialQuery changes (/search?q=a → ?q=b, or a back
  // button between two queries). The field is otherwise uncontrolled by the
  // host: typing owns `query` from then on.
  //
  // ⚠️ Done DURING RENDER, not in an effect. This is React's sanctioned
  // "adjusting state when a prop changes" pattern — React discards the
  // in-progress render and immediately re-runs the component, so nothing is
  // committed twice. An effect here would be a cascading render (and is banned
  // by react-hooks/set-state-in-effect). `open` is deliberately NOT touched:
  // re-seeding must never pop the suggestions panel open on a cold page load.
  const [seededFrom, setSeededFrom] = useState(initialQuery);
  if (seededFrom !== initialQuery) {
    setSeededFrom(initialQuery);
    setQuery(initialQuery);
    setDebounced(initialQuery.trim());
    setActive(-1);
  }

  // ── Voice search (YouTube-style) ────────────────────────────────────────────
  // Uses the browser's built-in Web Speech API — no server, no key, no data
  // leaves the device beyond the browser's own dictation. The mic button only
  // renders where the API exists (Chrome/Edge/Safari); elsewhere it's absent.
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const voiceSupported =
    typeof window !== "undefined" &&
    !!((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startVoice = useCallback(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => MinimalSpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => MinimalSpeechRecognition })
        .webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-GB";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join("")
        .trim();
      if (transcript) {
        setQuery(transcript);
        // Same synchronous reset as typing — dictation replaces the whole query,
        // so any highlight from the previous one is stale immediately.
        setActive(-1);
        setOpen(true);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
      inputRef.current?.focus();
    } catch {
      setListening(false);
    }
  }, []);

  const toggleVoice = () => (listening ? stopVoice() : startVoice());

  useEffect(() => () => recognitionRef.current?.abort(), []);

  // Focus the field on mount when the host asks (the header search reveal), so
  // it is ready to type the instant it slides open. A frame's delay lets the
  // open/enter transition mount the input first.
  useEffect(() => {
    if (!autoFocus) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [autoFocus]);

  // Debounce the query → debounced, so ranking runs ~once per pause, not per key.
  //
  // ⚠️ The highlight reset does NOT live here any more (2026-09-01). It used to,
  // and that opened a 120ms stale-results race: `showPanel` derives from `query`
  // (immediate) while `results` derives from `debounced` (delayed), so between a
  // keystroke and the debounce settling, `active` still indexed the PREVIOUS
  // query's list — arrow to row 5, type one more character, press Enter inside
  // 120ms and you navigated to a result for the query you had already abandoned.
  // `active` is now cleared SYNCHRONOUSLY in the input's onChange (and by voice
  // dictation), so a highlight can never outlive the query it was chosen from.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  // Results recompute only when the debounced query settles.
  const results: SearchResult[] = useMemo(
    () => (debounced ? searchSite(debounced, DROPDOWN_LIMIT) : []),
    [debounced],
  );

  // The panel shows whenever the field is focused/open AND there is a query —
  // either live results, or (with a non-empty query) at least the footer row.
  const showPanel = open && query.trim().length > 0;
  // The footer row is always the last navigable item when the panel is open with
  // a query — it lives at index === results.length. With results it commits the
  // query to the full page; with NO results it is the browse-all recovery.
  const footerIndex = results.length;
  const noMatches = debounced.length > 0 && results.length === 0;

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  const goToSearchPage = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      close();
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      onNavigate?.();
    },
    [navigate, close, onNavigate],
  );

  const goToResult = useCallback(
    (result: SearchResult) => {
      close();
      navigate(result.doc.url);
      onNavigate?.();
    },
    [navigate, close, onNavigate],
  );

  /** The browse-all recovery — the door offered when the index has nothing. */
  const goToBrowse = useCallback(() => {
    close();
    navigate(BROWSE.to);
    onNavigate?.();
  }, [navigate, close, onNavigate]);

  // Click-away closes the panel (but a click INSIDE — including a row Link —
  // is allowed to do its own navigation first via the Link's own handler).
  useEffect(() => {
    if (!showPanel) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showPanel, close]);

  // Keep the keyboard highlight IN VIEW. The listbox is capped at
  // max-h-[min(70vh,460px)] with overflow-y-auto, so on a short viewport the
  // arrow keys used to walk the active row straight out of the visible box:
  // aria-activedescendant kept screen readers correct, but a sighted keyboard
  // user was steering a highlight they could no longer see. `nearest` scrolls
  // only the listbox and only when it has to, so a fully-visible row never
  // jumps. Guarded on the panel + a real index so it no-ops at rest.
  useEffect(() => {
    if (!showPanel || active < 0) return;
    const el = document.getElementById(`${listboxId}-opt-${active}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, showPanel, listboxId]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // Two-stage Esc: first close the suggestions panel, then (a second Esc)
      // clear the query. When THIS field consumes the Esc, stop it bubbling so a
      // host that also listens for Esc (the Nav search reveal) doesn't collapse
      // on the same keypress. An Esc we don't use bubbles up to close the reveal.
      if (showPanel) {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (query) {
        e.stopPropagation();
        setQuery("");
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (showPanel && active >= 0 && active < results.length) {
        goToResult(results[active]);
      } else if (showPanel && noMatches && active === footerIndex) {
        // The highlighted row IS the browse recovery — Enter must do what the
        // row says it does, not silently submit the query instead.
        goToBrowse();
      } else {
        // Nothing highlighted → submit to the full page (which carries its own
        // recovery grid, so it is a real destination even with no matches).
        goToSearchPage(query);
      }
      return;
    }

    if (!showPanel) return;

    // The navigable range is [0 .. footerIndex] inclusive — the rows then the
    // "search everything" footer. ArrowDown from the input enters the list.
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i >= footerIndex ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= -1 ? footerIndex : i - 1));
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && active < results.length) goToResult(results[active]);
    else if (noMatches && active === footerIndex) goToBrowse();
    else goToSearchPage(query);
  };

  // Shared input/pill sizing per variant. The pill is the focusable surround;
  // we lift the ring to accent when the field is focused (focus-within).
  const pillSize = isPage
    ? "h-[52px] md:h-[56px] pl-12 md:pl-14 pr-14 text-[16px] md:text-[17px]"
    : "h-[54px] lg:h-[58px] pl-14 pr-14 text-[16px] lg:text-[17px]";
  const iconBox = isPage ? "left-4 md:left-5 h-5 w-5 md:h-[22px] md:w-[22px]" : "left-5 h-[20px] w-[20px]";

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      {/* role="search" belongs on the FORM (the convention), not the positioning
          wrapper, and it is NAMED — two instances can be on screen at once (the
          header reveal open over /search), which previously announced as two
          identical unnamed search landmarks. */}
      <form onSubmit={onSubmit} className="relative" role="search" aria-label={label}>
        <span
          aria-hidden="true"
          className={cn(
            // z-10: the page-variant input has backdrop-blur (its own stacking
            // context) and would otherwise paint OVER + blur this icon — Hugo's
            // "weird blur instead of a search symbol" in the drawer.
            "pointer-events-none absolute top-1/2 -translate-y-1/2 z-10 transition-colors duration-200",
            // The menu (page variant) sits on a near-black drawer where the
            // 0.7-muted glass read as nearly invisible (Hugo: "have a search
            // symbol on the menu") — give it the FULL cream there; the always-on
            // header pill keeps the quieter muted tone.
            isPage ? "text-ink" : "text-ink/80",
            iconBox,
          )}
        >
          <MagnifierIcon className="h-full w-full" />
        </span>

        <input
          ref={inputRef}
          type="search"
          // role=combobox + the listbox wiring makes the live results an
          // accessible autocomplete, navigable by AT users the same way as the
          // ArrowUp/Down keyboard path.
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showPanel && active >= 0 ? `${listboxId}-opt-${active}` : undefined
          }
          aria-label={label}
          // The "No matches" line lives OUTSIDE the listbox (a listbox may only
          // contain options), so point the combobox at it explicitly.
          aria-describedby={showPanel && noMatches ? statusId : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={isPage ? "Search artworks, collections, anything…" : "Search artworks…"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // SYNCHRONOUS highlight reset — see the debounce effect above. The
            // 120ms window between a keystroke and the settled result set must
            // never carry a stale `active` index into an Enter press.
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full rounded-full",
            // The header instance lives in the fixed, always-on Nav — a permanent
            // backdrop-blur there re-samples the region every scroll frame (the
            // per-frame cost DeliverTo already dropped). Keep the blur only for the
            // large /search "page" variant (not always-mounted); the always-on
            // header pill takes a near-opaque dark fill instead — the ring + nav
            // scrim already separate it. /90 is darker than the old /60, never brighter.
            // Header pill needs real edge-separation from the deep-red bar (Hugo:
            // the search "looked like a blur") — a distinct near-black fill + a
            // stronger cream ring, vs the page variant's blurred glass.
            isPage ? "bg-bg-soft/60 backdrop-blur-sm" : "bg-[#0a0908]/80",
            isPage ? "placeholder:text-ink-fade" : "placeholder:text-ink/45",
            "font-sans text-ink",
            isPage ? "ring-1 ring-line" : "ring-1 ring-[rgba(237,230,214,0.32)]",
            "transition-shadow duration-200",
            "focus:outline-none focus:ring-2 focus:ring-accent",
            // Hide the native clear/cancel UI so the chrome stays house-styled.
            "[&::-webkit-search-cancel-button]:appearance-none",
            pillSize,
          )}
        />

        {/* Voice search — a mic on the right of the pill, YouTube-style. Only
            rendered where the browser supports dictation. Pulses while listening
            (accent), quiet cream at rest. */}
        {voiceSupported && showVoice && (
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={listening ? "Stop voice search" : "Search by voice"}
            aria-pressed={listening}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center rounded-full transition-colors duration-200 outline-none",
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              isPage ? "right-3 md:right-4 h-9 w-9" : "right-3.5 h-9 w-9",
              listening
                ? "text-accent bg-accent/10 motion-safe:animate-pulse"
                : "text-ink/70 hover:text-ink hover:bg-ink/5",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-[20px] w-[20px]"
            >
              <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
              <path d="M19 11a7 7 0 0 1-14 0" />
              <path d="M12 18v3" />
            </svg>
          </button>
        )}
      </form>

      {showPanel && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl",
            "bg-bg ring-1 ring-line",
            "shadow-[0_24px_60px_rgba(0,0,0,0.55)]",
          )}
        >
          {/* "No matches" sits OUTSIDE the listbox. It used to be a
              role="presentation" <li> INSIDE it, which screen readers skip
              entirely — so aria-expanded="true" announced an open popup with
              nothing in it. As a role="status" sibling it is announced, and the
              input points at it via aria-describedby. */}
          {noMatches && (
            <p
              id={statusId}
              role="status"
              className="m-0 border-b border-line px-4 py-3 font-sans text-[13.5px] leading-[1.6] text-ink-muted"
            >
              {SEARCH.noMatches}
            </p>
          )}
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="max-h-[min(70vh,460px)] overflow-y-auto py-1.5"
          >
            {results.map((result, i) => {
                const { doc } = result;
                const isArtwork = doc.type === "painting";
                const highlighted = i === active;
                return (
                  <li key={doc.id} role="presentation">
                    <Link
                      id={`${listboxId}-opt-${i}`}
                      role="option"
                      aria-selected={highlighted}
                      to={doc.url}
                      // Pointer enter highlights the row so mouse + keyboard
                      // stay in agreement; the click commits via the Link.
                      onMouseEnter={() => setActive(i)}
                      onClick={() => {
                        close();
                        onNavigate?.();
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 transition-colors duration-150",
                        highlighted ? "bg-ink/[0.08]" : "hover:bg-ink/[0.05]",
                      )}
                    >
                      {isArtwork && doc.image ? (
                        <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-md ring-1 ring-line bg-bg-soft">
                          <AssetImage
                            src={doc.image}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            sizes="40px"
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full px-2 py-1",
                            "font-sans text-[13px] font-bold tracking-[0.02em]",
                            "text-ink-muted ring-1 ring-line",
                          )}
                        >
                          {SEARCH_TYPE_LABELS[doc.type]}
                        </span>
                      )}

                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate font-sans text-[14px] leading-[1.35] transition-colors duration-150",
                            highlighted ? "text-accent" : "text-ink",
                          )}
                        >
                          {doc.title}
                        </span>
                        {doc.subtitle && (
                          <span className="block truncate font-sans text-[14px] leading-[1.4] text-ink-muted">
                            {doc.subtitle}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
            })}

            {/* FOOTER ROW — the last navigable option, always present with a
                query.
                • With results: "search everything for <q>" → the full page.
                • With NO results: the browse-all RECOVERY (Collections).
                  It used to read "No matches yet — press Enter to search
                  everything", which was a guaranteed dead end: the dropdown and
                  the page call the SAME searchSite() at the same threshold, so
                  the limits only truncate — zero here always means zero there.
                  Offer a door that exists instead of promising one that doesn't. */}
            <li role="presentation" className="mt-1.5 border-t border-line">
              {noMatches ? (
                <Link
                  id={`${listboxId}-opt-${footerIndex}`}
                  role="option"
                  aria-selected={active === footerIndex}
                  to={BROWSE.to}
                  onMouseEnter={() => setActive(footerIndex)}
                  onClick={() => {
                    close();
                    onNavigate?.();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150",
                    active === footerIndex ? "bg-ink/[0.08]" : "hover:bg-ink/[0.05]",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-semibold text-ink">
                    {BROWSE.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 font-sans text-[13px] transition-colors duration-150",
                      active === footerIndex ? "text-accent" : "text-ink-muted",
                    )}
                  >
                    →
                  </span>
                </Link>
              ) : (
                <button
                  id={`${listboxId}-opt-${footerIndex}`}
                  role="option"
                  aria-selected={active === footerIndex}
                  type="button"
                  onMouseEnter={() => setActive(footerIndex)}
                  onClick={() => goToSearchPage(query)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150",
                    active === footerIndex ? "bg-ink/[0.08]" : "hover:bg-ink/[0.05]",
                  )}
                >
                  <MagnifierIcon className="h-4 w-4 shrink-0 text-ink-muted" />
                  <span className="min-w-0 flex-1 truncate font-sans text-[13px] text-ink-muted">
                    Search everything for{" "}
                    <span className="font-semibold text-ink">{query.trim()}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 font-sans text-[13px] transition-colors duration-150",
                      active === footerIndex ? "text-accent" : "text-ink-muted",
                    )}
                  >
                    →
                  </span>
                </button>
              )}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
