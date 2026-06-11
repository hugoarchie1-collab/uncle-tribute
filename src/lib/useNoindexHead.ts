import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyTransactionalHead } from "./headMeta";

/**
 * useNoindexHead — head treatment for TRANSACTIONAL routes (Basket, Order
 * success/cancel, NotFound): site-default meta + per-route canonical +
 * robots NOINDEX. The SPA serves every route with HTTP 200, so the meta tag
 * is the only honest "keep this out of the index" signal for a buyer's
 * basket or a soft-404. Pages call this INSTEAD of mounting <Seo> and keep
 * setting their human title via usePageTitle (one or the other, never both).
 * Lives in lib/ beside usePageTitle (a hook can't share Seo.tsx — the
 * react-refresh only-export-components rule).
 */
export const useNoindexHead = (): void => {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    applyTransactionalHead(pathname);
  }, [pathname]);
};
