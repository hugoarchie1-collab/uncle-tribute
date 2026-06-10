import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { merchantFeedPlugin } from "./scripts/merchant-feed";

// When deploying to GitHub Pages the site lives at /<repo-name>/.
// Vercel / Netlify / Cloudflare Pages serve from the root and want "/".
//
// The DEPLOY_TARGET env var (set by the GitHub Pages workflow) flips this.
const base = process.env.DEPLOY_TARGET === "github-pages" ? "/uncle-tribute/" : "/";

export default defineConfig({
  base,
  // merchantFeedPlugin emits dist/merchant-feed.xml (Google Merchant Center
  // product feed, generated from src/data/paintings.ts) + a summary txt.
  plugins: [react(), merchantFeedPlugin()],
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
