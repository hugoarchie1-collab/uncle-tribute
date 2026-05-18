import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When deploying to GitHub Pages the site lives at /<repo-name>/.
// Vercel / Netlify / Cloudflare Pages serve from the root and want "/".
//
// The DEPLOY_TARGET env var (set by the GitHub Pages workflow) flips this.
const base = process.env.DEPLOY_TARGET === "github-pages" ? "/uncle-tribute/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
});
