// =============================================================================
// CART-DRAWER OPEN SIGNAL
// =============================================================================
// A tiny pub/sub so any surface (the Nav basket button, etc.) can OPEN the
// slide-in cart drawer without a shared React context. Kept deliberately
// separate from the basket store (src/lib/basket.ts) so requesting the drawer
// can never perturb basket state, reconciliation, or cross-tab sync — it is a
// pure UI signal. The drawer itself also auto-opens on `subscribeToAdds`
// (add-to-basket), so this channel is only for MANUAL opens.
// =============================================================================

const openListeners = new Set<() => void>();

/** Request the cart drawer to open (e.g. from the Nav basket button). */
export const openCartDrawer = (): void => {
  for (const fn of openListeners) fn();
};

/**
 * Subscribe to "open the cart drawer" requests. Returns an unsubscribe fn.
 * The CartDrawer component subscribes once, globally.
 */
export const subscribeToCartOpen = (callback: () => void): (() => void) => {
  openListeners.add(callback);
  return () => {
    openListeners.delete(callback);
  };
};
