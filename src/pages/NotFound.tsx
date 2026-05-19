import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Button } from "../components/ui/button";
import { usePageTitle } from "../lib/usePageTitle";

export const NotFound = () => {
  usePageTitle("Page not found");
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Nav />
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <Reveal className="text-center">
          <p className="font-sans text-[13px] font-medium tracking-widest uppercase text-accent m-0 mb-4">
            404
          </p>
          <Link to="/">
            <Button variant="outline" size="lg">Return home →</Button>
          </Link>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
};
