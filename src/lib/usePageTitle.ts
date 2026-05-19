import { useEffect } from "react";

const DEFAULT_TITLE = "The Art of Stephen Meakin — Mandala Artist & Sacred Geometer";

/**
 * Set the browser tab title for the current page.
 *
 * Pass a page-specific title; we'll append " · The Art of Stephen Meakin"
 * unless the title is the brand itself. On unmount we reset to the default
 * so any page that forgets to call this falls back gracefully.
 */
export const usePageTitle = (title?: string) => {
  useEffect(() => {
    const previous = document.title;
    if (!title) {
      document.title = DEFAULT_TITLE;
    } else if (title.includes("Stephen Meakin")) {
      document.title = title;
    } else {
      document.title = `${title} · The Art of Stephen Meakin`;
    }
    return () => {
      document.title = previous;
    };
  }, [title]);
};
