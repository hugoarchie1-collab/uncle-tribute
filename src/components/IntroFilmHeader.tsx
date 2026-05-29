import { VideoIntro } from "./VideoIntro";
import { Nav } from "./Nav";

/**
 * The cinematic intro film as a page header, with the overlay Nav floating
 * above it. Placed at the top of content pages (in place of a bare `<Nav />`)
 * so the intro can be reached by scrolling up from anywhere on the site, not
 * just the home page.
 *
 * The `z-10` wrapper lifts the 100vh film above the fixed `AmbientBackdrop`
 * (z-0); the overlay Nav (`fixed`, z-50) floats above the film; and the page's
 * own `<main>` — which already carries generous top padding on the routed
 * pages — sits below the film and clears the fixed nav. Drop-in replacement for
 * `<Nav />` on pages whose root is `relative` with the backdrop as first child.
 */
export const IntroFilmHeader = () => (
  <>
    <div className="relative z-10">
      <VideoIntro />
    </div>
    <Nav overlay />
  </>
);
