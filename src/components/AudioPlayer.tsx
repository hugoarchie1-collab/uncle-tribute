import { useEffect, useRef, useState } from "react";

// Plays the intro ambient (Tibetan singing bowl + wind chimes) only during
// the cinematic intro, then fades out as the Welcome content appears.
//
// Drop your sourced audio file at /public/audio/intro.mp3 (search Pixabay
// for "singing bowl wind chimes meditation"). Until that file exists,
// the player simply renders a silent toggle and never throws.

const FADE_MS = 1800;
const TARGET_VOLUME = 0.5;

interface AudioPlayerProps {
  /** when true, the audio fades out (signals end of intro) */
  fadeOut?: boolean;
}

export const AudioPlayer = ({ fadeOut = false }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hasFile, setHasFile] = useState(true);

  // Browsers block autoplay audio without a user gesture. Surface a one-time
  // "sound on" prompt that the user can dismiss.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0;
    a.loop = true;
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !enabled) return;
    const target = fadeOut ? 0 : TARGET_VOLUME;
    const from = a.volume;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / FADE_MS);
      a.volume = from + (target - from) * p;
      if (p < 1) raf = requestAnimationFrame(step);
      else if (fadeOut) a.pause();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fadeOut, enabled]);

  const handleEnable = () => {
    const a = audioRef.current;
    if (!a) return;
    a.play()
      .then(() => setEnabled(true))
      .catch(() => setHasFile(false));
  };

  return (
    <>
      <audio
        ref={audioRef}
        src="/audio/intro.mp3"
        preload="auto"
        onError={() => setHasFile(false)}
      />
      {!enabled && hasFile && !fadeOut && (
        <button
          type="button"
          onClick={handleEnable}
          className="audio-prompt"
          aria-label="Enable sound"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 9v6h4l5 4V5L9 9H5z" />
            <path d="M16 8a5 5 0 0 1 0 8" />
            <path d="M19 5a9 9 0 0 1 0 14" />
          </svg>
          <span>Sound</span>
        </button>
      )}
    </>
  );
};
