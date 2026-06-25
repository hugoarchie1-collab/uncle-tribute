import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { merchantFeedPlugin } from "./scripts/merchant-feed";
import { prerenderPlugin } from "./scripts/prerender";

// When deploying to GitHub Pages the site lives at /<repo-name>/.
// Vercel / Netlify / Cloudflare Pages serve from the root and want "/".
//
// The DEPLOY_TARGET env var (set by the GitHub Pages workflow) flips this.
const base = process.env.DEPLOY_TARGET === "github-pages" ? "/uncle-tribute/" : "/";

// A unique id for THIS build. It is baked into the bundle (via `define` below,
// read as __APP_BUILD_ID__) AND written to dist/version.json by the plugin, so a
// running app can notice when a NEWER build has deployed and offer a one-tap
// refresh (src/components/UpdatePrompt.tsx) — the permanent fix for a phone /
// backgrounded tab staying stuck on an old cached build. A monotonic base-36
// timestamp keeps it sortable + human-debuggable.
const BUILD_ID = Date.now().toString(36);

// Emit dist/version.json = { id: BUILD_ID } at the end of every production build.
// /version.json is served by the catch-all `max-age=0, must-revalidate` header
// (vercel.json), so the client always revalidates it. apply:"build" → never runs
// in `vite dev` (there is no dist, so the runtime fetch just 404s + no-ops).
const versionStampPlugin = () => ({
  name: "version-stamp",
  apply: "build" as const,
  closeBundle() {
    try {
      writeFileSync(
        resolve(process.cwd(), "dist/version.json"),
        JSON.stringify({ id: BUILD_ID }) + "\n",
      );
    } catch (e) {
      console.warn("[version-stamp]", (e as Error).message);
    }
  },
});

export default defineConfig({
  base,
  // __APP_BUILD_ID__ is replaced at compile time with the build id literal.
  define: { __APP_BUILD_ID__: JSON.stringify(BUILD_ID) },
  // merchantFeedPlugin emits dist/merchant-feed.xml (Google Merchant Center
  // product feed, generated from src/data/paintings.ts) + a summary txt.
  // prerenderPlugin emits dist/<route>/index.html for every indexable route
  // with the correct per-route <head> + JSON-LD baked into the raw HTML, so
  // non-JS crawlers (Bing, AI, social unfurlers, Merchant Center) see the real
  // page instead of the SPA shell. Both run at closeBundle, order-independent.
  plugins: [react(), merchantFeedPlugin(), prerenderPlugin(), versionStampPlugin()],
  build: {
    rolldownOptions: {
      output: {
        // Peel the heavy, rarely-changing libraries into their own long-cached
        // chunks so they (a) download in parallel with the app code and (b)
        // stay cached across deploys instead of busting on every app change.
        // framer-motion is the single biggest dep and was shipping inside the
        // eager landing-page chunk.
        advancedChunks: {
          groups: [
            {
              name: "framer-motion",
              test: /[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils|motion)[\\/]/,
            },
            {
              name: "vendor-react",
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
