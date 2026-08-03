import { isSaved, toggleWishlist, useWishlist } from "../lib/wishlist";
import { cn } from "../lib/cn";

/**
 * A small heart toggle that saves a painting+colourway to the wishlist.
 * Reads live state via useWishlist() so every instance updates together.
 * `floating` places it as an overlay chip (top-right of an image tile);
 * otherwise it renders inline. Purely client-side (localStorage).
 */
export const WishlistButton = ({
  paintingId,
  colourwayName,
  floating = false,
  className,
}: {
  paintingId: string;
  colourwayName: string;
  floating?: boolean;
  className?: string;
}) => {
  // Subscribe so the icon re-renders whenever the list changes anywhere; then
  // read this pair's saved state directly.
  useWishlist();
  const saved = isSaved(paintingId, colourwayName);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(paintingId, colourwayName);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      title={saved ? "Saved" : "Save to wishlist"}
      className={cn(
        "inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        floating
          ? "absolute top-3 right-3 z-10 h-10 w-10 rounded-full bg-bg/70 backdrop-blur-sm ring-1 ring-line hover:ring-accent/60"
          : "h-11 w-11 rounded-full ring-1 ring-line hover:ring-accent/60",
        className,
      )}
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={cn("transition-colors", saved ? "text-accent" : "text-ink-muted")}
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path d="M12 20.3l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 5.42 3.62 3.8 5.7 3.8c1.17 0 2.3.55 3.02 1.42L12 8.5l3.28-3.28A3.97 3.97 0 0 1 18.3 3.8C20.38 3.8 22 5.42 22 7.5c0 3.78-3.4 6.86-8.55 11.48L12 20.3z" />
      </svg>
    </button>
  );
};
