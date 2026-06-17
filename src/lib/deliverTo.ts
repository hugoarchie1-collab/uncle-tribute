// =============================================================================
// DELIVER-TO STORE — the single source of truth for the visitor's chosen
// delivery REGION (a UI preference only — it does NOT change pricing).
// =============================================================================
// Mirrors the consent/basket store pattern (lib/consent.ts, lib/basket.ts): a
// tiny localStorage-backed value + a hand-rolled pub/sub + a
// `useSyncExternalStore` hook. No context, no Redux.
//
// IMPORTANT — informational ONLY. Delivery is FREE worldwide on every order
// (estate policy 2026-06-06; see CLAUDE.md "Shipping — FREE worldwide"). This
// control exists purely so a visitor sees their own region echoed back in an
// Amazon-style "Deliver to" affordance; the chosen region is never read by
// checkout and never alters a price. It is therefore safe to persist without
// consent — it's a first-party UI preference that never leaves the device.
//
// Contract: localStorage key `tasm.deliverTo` holds one of the REGION ids
// below as a bare string. An absent / unrecognised value reads as the default
// region (United Kingdom).
// =============================================================================

import { useSyncExternalStore } from "react";

/** A selectable delivery region. `id` is the persisted token; `label` is the
 *  cream country/region name shown on the control. */
export interface DeliverRegion {
  id: string;
  label: string;
}

/**
 * The five regions, in display order. Mirrors the shipping regions the estate
 * already names sitewide (UK / Europe / North America / Australia & New
 * Zealand / Rest of world). Every region ships FREE — the note rendered beside
 * each option says so — so the list is a preference echo, not a rate picker.
 */
export const DELIVER_REGIONS: readonly DeliverRegion[] = [
  { id: "uk", label: "United Kingdom" },
  { id: "europe", label: "Europe" },
  { id: "north-america", label: "North America" },
  { id: "anz", label: "Australia & New Zealand" },
  { id: "rest-of-world", label: "Rest of world" },
] as const;

/** The default region when nothing is stored — United Kingdom (the estate's
 *  home market). */
export const DEFAULT_REGION_ID = "uk";

const STORAGE_KEY = "tasm.deliverTo";

const isBrowser = typeof window !== "undefined";

const isKnownRegionId = (v: unknown): v is string =>
  typeof v === "string" && DELIVER_REGIONS.some((r) => r.id === v);

/** Resolve a region id to its full record, falling back to the default. */
export const regionById = (id: string): DeliverRegion =>
  DELIVER_REGIONS.find((r) => r.id === id) ??
  DELIVER_REGIONS.find((r) => r.id === DEFAULT_REGION_ID)!;

// In-memory mirror so reads stay referentially stable between renders
// (useSyncExternalStore loops on a fresh value each call). `undefined` means
// "not read yet"; a string is the resolved, validated region id.
let cache: string | undefined;
const listeners = new Set<() => void>();

const readFromStorage = (): string => {
  if (!isBrowser) return DEFAULT_REGION_ID;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isKnownRegionId(raw) ? raw : DEFAULT_REGION_ID;
  } catch {
    return DEFAULT_REGION_ID;
  }
};

const ensureCache = (): string => {
  if (cache === undefined) cache = readFromStorage();
  return cache;
};

const emit = () => {
  for (const fn of listeners) fn();
};

// ---- Public API ------------------------------------------------------------

/** The current region id (always a valid, known id — never undefined). */
export const getDeliverToId = (): string => ensureCache();

/** The current region record (id + label). */
export const getDeliverTo = (): DeliverRegion => regionById(getDeliverToId());

/**
 * Store the chosen region. Ignores an unknown id (defensive — never persist a
 * value the dropdown can't render). Persists + notifies every subscriber.
 */
export const setDeliverTo = (id: string): void => {
  if (!isKnownRegionId(id)) return;
  cache = id;
  if (isBrowser) {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Quota / private mode — the in-memory choice still holds for the session.
    }
  }
  emit();
};

// ---- React subscription ----------------------------------------------------

const subscribe = (callback: () => void): (() => void) => {
  listeners.add(callback);
  // Cross-tab sync — a choice made in another tab applies here too.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = readFromStorage();
    emit();
  };
  if (isBrowser) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (isBrowser) window.removeEventListener("storage", onStorage);
  };
};

const getSnapshot = (): string => ensureCache();
const getServerSnapshot = (): string => DEFAULT_REGION_ID;

/**
 * Reactive hook — the current region record + a setter, re-rendering whenever
 * the choice changes (this tab or another). The setter is the module-level
 * `setDeliverTo` (stable identity), so it's safe in deps.
 */
export const useDeliverTo = (): {
  region: DeliverRegion;
  regionId: string;
  setRegion: (id: string) => void;
} => {
  const regionId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { region: regionById(regionId), regionId, setRegion: setDeliverTo };
};
