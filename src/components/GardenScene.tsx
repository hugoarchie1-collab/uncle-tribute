// The transition scene: Garden of Eden green + Wild Rose mandala on an easel
// + empty wooden chair beside it. Shown after the cave pan completes.
//
// We composite this from CSS gradients + the actual Wild Rose painting +
// SVG silhouettes for the easel/chair. If a real photograph of this scene
// is ever provided, swap the contents of <div className="garden-scene"> for
// a single <img src="/img/scenes/easel-chair.jpg" />.

export const GardenScene = () => (
  <div className="garden-scene">
    {/* Sky bloom */}
    <div className="garden-sky" />
    {/* Verdant ground */}
    <div className="garden-ground" />
    {/* Light shaft */}
    <div className="garden-shaft" />

    {/* Easel + painting */}
    <div className="easel-wrap">
      <svg className="easel" viewBox="0 0 240 320" aria-hidden="true">
        {/* tripod legs */}
        <line x1="50" y1="20" x2="20" y2="310" stroke="#3a2a1c" strokeWidth="6" strokeLinecap="round" />
        <line x1="190" y1="20" x2="220" y2="310" stroke="#3a2a1c" strokeWidth="6" strokeLinecap="round" />
        <line x1="120" y1="80" x2="120" y2="320" stroke="#2e2014" strokeWidth="5" strokeLinecap="round" />
        {/* canvas ledge */}
        <rect x="40" y="240" width="160" height="8" rx="2" fill="#3a2a1c" />
        {/* cross-beam */}
        <line x1="40" y1="180" x2="200" y2="180" stroke="#3a2a1c" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <img
        src="/img/paintings/wild-rose-sussex-pink.jpg"
        alt=""
        className="easel-canvas"
      />
    </div>

    {/* Empty wooden chair */}
    <svg className="empty-chair" viewBox="0 0 200 340" aria-hidden="true">
      {/* back posts */}
      <line x1="40" y1="20" x2="40" y2="220" stroke="#2a1e14" strokeWidth="8" strokeLinecap="round" />
      <line x1="150" y1="20" x2="150" y2="220" stroke="#2a1e14" strokeWidth="8" strokeLinecap="round" />
      {/* back slats */}
      <line x1="40" y1="50" x2="150" y2="50" stroke="#2a1e14" strokeWidth="5" strokeLinecap="round" />
      <line x1="40" y1="90" x2="150" y2="90" stroke="#2a1e14" strokeWidth="5" strokeLinecap="round" />
      <line x1="40" y1="130" x2="150" y2="130" stroke="#2a1e14" strokeWidth="5" strokeLinecap="round" />
      {/* seat */}
      <rect x="20" y="200" width="160" height="22" rx="3" fill="#3a2a1c" />
      {/* legs */}
      <line x1="40" y1="220" x2="35" y2="330" stroke="#2a1e14" strokeWidth="8" strokeLinecap="round" />
      <line x1="150" y1="220" x2="155" y2="330" stroke="#2a1e14" strokeWidth="8" strokeLinecap="round" />
      <line x1="50" y1="220" x2="55" y2="330" stroke="#2a1e14" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      <line x1="140" y1="220" x2="135" y2="330" stroke="#2a1e14" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
    </svg>
  </div>
);
