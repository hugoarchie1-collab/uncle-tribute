import { useEffect, useRef, useState } from "react";
import { CaveIntro } from "../components/CaveIntro";
import { AudioPlayer } from "../components/AudioPlayer";
import { Nav } from "../components/Nav";
import { WELCOME } from "../data/content";

export const Welcome = () => {
  const [introDone, setIntroDone] = useState(false);
  const welcomeRef = useRef<HTMLDivElement>(null);

  // Once the intro completes, smooth-scroll the user into the welcome content.
  useEffect(() => {
    if (introDone && welcomeRef.current) {
      welcomeRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [introDone]);

  return (
    <>
      <AudioPlayer fadeOut={introDone} />
      <CaveIntro onComplete={() => setIntroDone(true)} />

      <div ref={welcomeRef} className="welcome-page">
        <Nav />
        <main className="welcome-main">
          <section className="welcome-hero">
            <blockquote className="welcome-quote">
              <p>{WELCOME.openingQuote}</p>
              <cite>— {WELCOME.openingAttribution}</cite>
            </blockquote>
          </section>

          <section className="welcome-body">
            <p className="welcome-paragraph">{WELCOME.reminder}</p>

            <p className="welcome-passing">{WELCOME.passingNote}</p>

            <p className="welcome-invocation">{WELCOME.invocation}</p>

            {WELCOME.bio.map((para, i) => (
              <p key={i} className="welcome-paragraph">
                {para}
              </p>
            ))}
          </section>

          <section className="welcome-cta">
            <a href="/collections" className="cta-link">
              Enter the Collections
              <span aria-hidden="true"> →</span>
            </a>
          </section>
        </main>
      </div>
    </>
  );
};
