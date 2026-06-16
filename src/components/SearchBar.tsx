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
import { cn } from "../lib/cn";

interface SearchBarProps {
  className?: string;
  /** "header" = compact (desktop Nav / mobile menu); "page" = large (/search). */
  variant?: "header" | "page";
  /** Called after any navigation commits — lets the host (mobile drawer) close. */
  onNavigate?: () => void;
}

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
  onNavigate,
}: SearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  // -1 = nothing highlighted (Enter submits to /search); 0..n highlights a row.
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const isPage = variant === "page";

  // Debounce the query → debounced, so ranking runs ~once per pause, not per
  // key. A settled new query also resets the highlight (a stale index must not
  // survive into a fresh result set) — done here, in the same external-sync
  // effect, rather than a separate effect that would cascade a render.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(query.trim());
      setActive(-1);
    }, DEBOUNCE_MS);
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
  // The footer "search everything" row is always the last navigable item when
  // the panel is open with a query — it lives at index === results.length.
  const footerIndex = results.length;

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

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // Esc closes the panel; a second Esc (panel already closed) clears it.
      if (showPanel) {
        e.preventDefault();
        close();
      } else if (query) {
        setQuery("");
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (showPanel && active >= 0 && active < results.length) {
        goToResult(results[active]);
      } else {
        // Nothing highlighted (or the footer row) → submit to the full page.
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
    else goToSearchPage(query);
  };

  // Shared input/pill sizing per variant. The pill is the focusable surround;
  // we lift the ring to accent when the field is focused (focus-within).
  const pillSize = isPage
    ? "h-[52px] md:h-[56px] pl-12 md:pl-14 pr-4 text-[16px] md:text-[17px]"
    : "h-10 pl-10 pr-3 text-[14px]";
  const iconBox = isPage ? "left-4 md:left-5 h-5 w-5 md:h-[22px] md:w-[22px]" : "left-3 h-4 w-4";

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full", className)}
      role="search"
    >
      <form onSubmit={onSubmit} className="relative">
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-muted transition-colors duration-200",
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
          aria-label="Search artworks, collections, anything"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="Search artworks, collections, anything…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full rounded-full bg-bg-soft/60 backdrop-blur-sm",
            "font-sans text-ink placeholder:text-ink-faint",
            "ring-1 ring-line transition-shadow duration-200",
            "focus:outline-none focus:ring-2 focus:ring-accent",
            // Hide the native clear/cancel UI so the chrome stays house-styled.
            "[&::-webkit-search-cancel-button]:appearance-none",
            pillSize,
          )}
        />
      </form>

      {showPanel && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl",
            "bg-bg/95 backdrop-blur-md ring-1 ring-line",
            "shadow-[0_24px_60px_rgba(0,0,0,0.55)]",
          )}
        >
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Search suggestions"
            className="max-h-[min(70vh,460px)] overflow-y-auto py-1.5"
          >
            {results.length === 0 ? (
              <li
                role="presentation"
                className="px-4 py-3 font-sans text-[13.5px] leading-[1.6] text-ink-muted"
              >
                No matches yet — press Enter to search everything.
              </li>
            ) : (
              results.map((result, i) => {
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
                            "font-sans text-[10px] font-bold uppercase tracking-[0.18em]",
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
                          <span className="block truncate font-sans text-[12px] leading-[1.4] text-ink-muted">
                            {doc.subtitle}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })
            )}

            {/* Footer "search everything" row — always present with a query, so
                Enter from anywhere lands the user on the full results page. It
                is a button (not a Link) because it composes the query into the
                /search route via useNavigate. */}
            <li role="presentation" className="mt-1.5 border-t border-line">
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
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
