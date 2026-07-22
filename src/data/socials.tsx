import type { ReactNode } from "react";

/**
 * Official estate social profiles — the SINGLE source of truth.
 *
 * The SAME URLs are wired into the Organization `sameAs` array in index.html
 * (the strongest cross-web signal tying the brand together — Knowledge-Panel /
 * entity grounding). Consumed by both the Footer "Follow" row and the /links
 * hub page, so the two surfaces can never drift. Icons are inline SVG on
 * `currentColor` so they inherit whatever muted→ink hover the caller sets.
 *
 * When a new channel goes live (TikTok / YouTube / etc.), add it here AND to
 * the `sameAs` array in index.html — nowhere else.
 */
export interface SocialProfile {
  label: string;
  href: string;
  icon: ReactNode;
}

export const SOCIAL_PROFILES: SocialProfile[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/theartofstephenmeakin/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.42.56.21.96.47 1.38.89.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.89.43-.17 1.06-.37 2.23-.42 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07c-1.27.06-2.15.26-2.91.56-.79.3-1.46.71-2.13 1.38S.94 3.35.63 4.14c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0z" />
        <path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84M12 16a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
        <circle cx="18.41" cy="5.59" r="1.44" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@themandalacompany",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.2v12.93a2.58 2.58 0 0 1-2.58 2.5 2.58 2.58 0 1 1 .76-5.05V9.9a5.9 5.9 0 0 0-.76-.05 5.83 5.83 0 1 0 5.83 5.83V9.02a7.44 7.44 0 0 0 4.35 1.4V7.2a4.28 4.28 0 0 1-3.34-1.38z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@TheMandalaCompany",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.6 15.57V8.43L15.8 12l-6.2 3.57z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61590902138021",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.03 4.39 11.03 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.01 1.79-4.68 4.53-4.68 1.31 0 2.69.24 2.69.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
      </svg>
    ),
  },
  {
    label: "Pinterest",
    href: "https://www.pinterest.com/theartofstephenmeakin/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.43 7.63 11.18-.11-.95-.2-2.41.04-3.45.22-.93 1.4-5.94 1.4-5.94s-.36-.72-.36-1.78c0-1.67.97-2.91 2.17-2.91 1.02 0 1.51.77 1.51 1.69 0 1.03-.65 2.56-1 3.99-.28 1.2.6 2.18 1.79 2.18 2.15 0 3.8-2.27 3.8-5.54 0-2.9-2.08-4.92-5.06-4.92-3.44 0-5.47 2.58-5.47 5.25 0 1.04.4 2.16.9 2.76.1.12.11.23.08.35-.09.38-.3 1.2-.34 1.36-.05.22-.18.27-.41.16-1.53-.71-2.48-2.94-2.48-4.74 0-3.86 2.81-7.41 8.1-7.41 4.25 0 7.56 3.03 7.56 7.08 0 4.22-2.66 7.62-6.36 7.62-1.24 0-2.41-.65-2.81-1.41l-.76 2.91c-.28 1.06-1.02 2.39-1.52 3.2C9.57 23.81 10.76 24 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0z" />
      </svg>
    ),
  },
];
