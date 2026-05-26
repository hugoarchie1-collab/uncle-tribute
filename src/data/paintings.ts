// =============================================================================
// PAINTINGS DATA
// =============================================================================
// This file is the source of truth for every painting on the site.
//
// HOW TO EDIT:
//   - Edit any text in quotes (titles, descriptions, dates)
//   - Replace "[TBD]" placeholders with real values when ready
//   - Set `available: false` on a colourway to hide its swatch on the site
//   - Add new colourways inside a painting's `colourways: [...]` array
//   - Add new paintings as new objects in the exported array below
// =============================================================================

export interface Colourway {
  name: string;
  image: string;          // path under /public, e.g. "/img/paintings/wild-rose-sussex-pink.jpg"
  hex: string;            // hex colour for the swatch dot
  isOriginal: boolean;    // true if this is the original print; false for alt colourways
  available: boolean;     // set false to hide the swatch entirely
  sizing?: string;        // [TBD] e.g. "Limited edition giclée print, A1 (594 × 841 mm)"
  framing?: string;       // [TBD] e.g. "Hand-finished oak frame with museum glass"
  price?: string;         // [TBD] e.g. "£450"
  editionSize?: string;   // [TBD] e.g. "Limited to 50, hand-signed"
  colourwayNote?: string; // [TBD] the story of why this colourway exists (Stephen's studio files)
}

export interface Painting {
  id: string;
  title: string;
  year: string;
  collection: "habundia" | "genesis" | "born-in-the-sky";
  size?: string;           // e.g. "60 × 60 cm (approx. 24 × 24 in)" — from the source PDF
  description: string;     // the full story for this painting
  artistQuote?: string;    // Stephen's own words, if a quote exists for this piece
  location?: string;       // e.g. "Ditchling, Sussex"
  colourways: Colourway[];
}

/**
 * Boilerplate from the source PDFs, identical for every painting.
 * Centralised here so editing once propagates to every painting page.
 */
export const ORIGINAL_PRINT_SPEC =
  "Printed on 350gsm archival canvas using pigment inks, hand-stretched on a deep wooden frame. Individually made to order.";

export const COLOURWAY_NOTE =
  "Each colourway was created by Stephen himself and discovered on his computer in his studio. These are his own colour variations of the work, exactly as he left them.";

export interface Collection {
  id: "habundia" | "genesis" | "born-in-the-sky";
  title: string;
  description: string;
  /**
   * Optional path to a real photograph to use as the collection hero backdrop.
   * If present, this overrides the hand-drawn SVG scene.
   *
   * Source images (Earth → Water → Sky):
   *   habundia:        ancient British woodland, dawn light through canopy, bluebells
   *   genesis:         bioluminescent ocean at night, electric blue/teal blooms
   *   born-in-the-sky: Milky Way arching over a dark horizon, dense star field
   *
   * Save the file at e.g. /public/img/scenes/habundia.jpg and reference it as
   * "/img/scenes/habundia.jpg".
   */
  backdropImage?: string;
}

// -----------------------------------------------------------------------------
// COLLECTIONS — top-level groupings, used on the Collections page
// -----------------------------------------------------------------------------

export const COLLECTIONS: Collection[] = [
  {
    id: "habundia",
    title: "Habundia — Seven Wild Flowers of the British Isles",
    description:
      "Stephen spent his life studying the sacred geometry of ancient temples, Persian courts and Tibetan monasteries. In 2018, he turned to the fields outside his door.\n\nA series of British wild flower mandalas, each painted with oil pressed from the flower it depicts, each built on the same geometric precision he brought to every canvas.\n\nHabundia is the medieval spirit of wild abundance. She is not cultivated. She cannot be controlled. Stephen named this series after her because the flowers he chose share that quality: they appear where they will, in their season, without permission.\n\nHe found the same ancient geometry in all of them.",
    backdropImage: "/img/scenes/habundia-blur.webp",
  },
  {
    id: "genesis",
    title: "Genesis Mandalas",
    description:
      "Stephen had been exploring geometry in private sketchbooks for years, learning the techniques of Celtic and Persian pattern making, studying the decorative arts of Gothic Europe and Tibet. In 1999, while studying Architecture at the University of Brighton, he made his first major mandala.\n\nThese are the Genesis paintings — three works from the earliest years of his life as a mandala artist, made between 1999 and 2001. The works that opened Stephen's practice and established its three foundations: sacred number, divine encounter, and nature's rarest geometry.",
    backdropImage: "/img/scenes/genesis-blur.webp",
  },
  {
    id: "born-in-the-sky",
    title: "Born in the Sky",
    description:
      "Stephen worked at night. While the world slept, he was at his canvas, alone with geometry and gold leaf and the dark outside the window. He understood, more than most, what it felt like to carry knowledge that set you apart. To see things others didn't look for. To find more companionship in the sky than in a room full of people.\n\nThese five paintings came from that place. Each one about something above us that most people never notice: a constellation left out, a comet on its only pass, a message sent into deep space not knowing if it will ever be received, nine stars in the shape of a swan.\n\nThings that exist beyond the edge of what is commonly seen or celebrated. Stephen found them beautiful. He spent months, sometimes over a year, bringing each one down to earth.\n\nHe called the Enneagon a painting born in the sky. All five of these were.",
    backdropImage: "/img/scenes/born-in-the-sky-blur.webp",
  },
];

// -----------------------------------------------------------------------------
// PAINTINGS
// -----------------------------------------------------------------------------

export const PAINTINGS: Painting[] = [
  // -------------------------------------------------------------------------
  // HABUNDIA
  // -------------------------------------------------------------------------
  {
    id: "wild-rose",
    title: "Mandala of Wild Rose",
    year: "2018",
    collection: "habundia",
    size: "60 × 60 cm (approx. 24 × 24 in)",
    location: "Ditchling, Sussex",
    description:
      "Habundia is the medieval spirit of wild abundance, the presence that moves through the hedgerows and ungoverned places. Stephen named his seven British wild flower mandalas after her.\n\nHe painted it with actual wild rose oil. The painting contains the flower it depicts.\n\nThe numbers carry their own meaning. Six flowers: the hexagon. Five buds: the geometry of Venus, the planet that traces a five-petalled rose across the sky in its eight-year dance with Earth. The wild rose has five petals. It already carries that geometry.\n\nThe thorns are inside the circle, too. The rose cannot be separated from what protects it. Beauty and danger arriving together — every tradition that has encountered this plant understands this.\n\nThe wild rose blooms across every Sussex hedgerow each June without being planted. It simply appears, as it has for millennia.\n\nStephen painted this in Ditchling, Sussex, in the heart of the South Downs.",
    artistQuote:
      "Within the circle amongst the many thorns are 6 rose flowers, 5 rose buds, 10 rose hearts, and 40 rose hips.",
    colourways: [
      {
        name: "Sussex Pink",
        image: "/img/paintings/wild-rose-sussex-pink.jpg",
        hex: "#d9a3b5",
        isOriginal: true,
        available: true,
      },
      {
        name: "Deep Forest Red",
        image: "/img/paintings/wild-rose-deep-forest-red.jpg",
        hex: "#5a2a23",
        isOriginal: false,
        available: true,
      },
    ],
  },
  {
    id: "english-bluebells",
    title: "Mandala of English Bluebells",
    year: "2019",
    collection: "habundia",
    size: "60 × 60 cm (approx. 24 × 24 in)",
    description:
      "The second painting from the Habundia collection. As with the Wild Rose, Stephen painted it using actual bluebell oil.\n\nNot a painting of bluebells. A painting about being there.\n\nSix large bells. Twelve small. Forty-eight buds, three white and one pink among them: the exceptions noticed, named, counted. Five open blooms and one pentangle. The pentangle is a five-pointed star, the geometry of Venus, the planet that traces a five-petalled rose across the sky in its eight-year orbit with Earth. The wild rose carries it in its petals. Stephen found it again here.\n\nSix owls sit in six trees whose leaves have not yet opened. The bluebell blooms in a narrow window each spring, before the canopy closes and the light disappears from the forest floor. The owls are in the bare branches above. They see in darkness what others cannot.\n\nThis was the centrepiece of Stephen's final exhibition, at Unique Arts Gallery in Brighton, 2019.",
    artistQuote:
      "A painting about being in the bluebell woods. Within the circle of 6 large bells are 12 small bells, 48 bluebell buds, three of which are white and one of which is pink, together with 5 open blooms and one pentangle. There are 6 owls in the six trees that are just about to fill with leaves.",
    colourways: [
      {
        name: "Original",
        image: "/img/paintings/english-bluebells.jpg",
        hex: "#a9b9d6",
        isOriginal: true,
        available: true,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // GENESIS
  // -------------------------------------------------------------------------
  {
    id: "orchis-7",
    title: "Mandala of Seven — Orchis 7 — Septagon",
    year: "1999",
    collection: "genesis",
    size: "70 × 70 cm (approx. 28 × 28 in)",
    description:
      "The septagon cannot be drawn perfectly. Unlike every other regular polygon, it cannot be constructed with a compass and straight edge alone. It can only be estimated. Stephen chose it as the foundation of this work.\n\nSeven is the only number between one and ten that neither divides nor multiplies into any other. Every tradition assigned it to the sacred: seven chakras, seven heavens, seven planets. Pythagoras called it three plus four, triangle plus square, heaven plus earth. The number that belongs to neither and therefore stands alone.\n\nThe flower Stephen placed within this geometry is the Lady's Slipper Orchid. It is Britain's rarest native wildflower. There is one wild plant left in England. Its location is secret, guarded by Natural England. Darwin studied the pollination mechanism: the flower's pouch traps an insect, coats it in pollen, and then releases it. Stephen painted thirty of them.\n\nHe gave the rarest flower in England to the polygon that cannot be perfectly drawn. Two things that can only be approximated, held together in gold leaf.\n\nJung documented the mandala emerging spontaneously during individuation, the psyche's own attempt to picture its wholeness. Stephen spent hundreds of hours constructing what the psyche reaches for on its own.",
    artistQuote:
      "If you see beauty in these paintings, that is because you can see part of yourself, like in a mirror, you see something you know. Something totally cosmic is reflected in you.",
    colourways: [
      {
        name: "Rubedo Red",
        image: "/img/paintings/orchis7-rubedo-red.jpg",
        hex: "#7a2a2e",
        isOriginal: true,
        available: true,
      },
      {
        name: "Aquamarine Blue",
        image: "/img/paintings/orchis7-aquamarine-blue.jpg",
        hex: "#7fa9a3",
        isOriginal: true,
        available: true,
      },
      {
        name: "Amethyst Purple",
        image: "/img/paintings/orchis7-amethyst-purple.jpg",
        hex: "#9b88c8",
        isOriginal: false,
        available: true,
      },
      {
        name: "Vespa Violet",
        image: "/img/paintings/orchis7-vespa-violet.jpg",
        hex: "#7d6da3",
        isOriginal: false,
        available: true,
      },
      {
        name: "Citrine Neon",
        image: "/img/paintings/orchis7-citrine-neon.jpg",
        hex: "#c9d970",
        isOriginal: false,
        available: true,
      },
    ],
  },
  {
    id: "flower-of-life",
    title: "Mandala of Transformation — Flower of Life",
    year: "Y2K (2000)",
    collection: "genesis",
    size: "75 × 75 cm (approx. 30 × 30 in)",
    description:
      "At the turn of the millennium, Stephen had not painted for fourteen months. Then a peacock butterfly came through the window.\n\nHe built the work on the Flower of Life, a geometric symbol found carved into the Osireion at Abydos and studied by Leonardo da Vinci. It is the structure from which all other sacred geometry derives. Its natural form is the dodecagon: twelve, the number every civilisation has used to mark a complete cycle. The zodiac. The apostles. The months.\n\nThe peacock butterfly carries eyes on its wings. In Indian tradition, it is the companion of Lakshmi. In Roman mythology, its markings are the eyes of Argus, a symbol of all-seeing vision.\n\nIn Greek, psyche means soul. It also means butterfly.",
    artistQuote:
      "This large, dramatic and explosive design was originally conceived in the days after a large peacock butterfly flew through the studio window of an old cottage in the spring of the year 2000. The circumstances surrounding this gentle visitation were nothing less than miraculous. The butterfly appears from within a dusty sunbeam, flying in a spiral to land in the centre of a 5ft blank canvas, and it opened and closed its wings 3 times before flying back up the sunbeam and on its way.",
    colourways: [
      {
        name: "Kaleidoscope",
        image: "/img/paintings/fol-kaleidoscope.jpg",
        hex: "#4a3a78",
        isOriginal: true,
        available: true,
      },
      {
        name: "Phoenix Orange",
        image: "/img/paintings/fol-phoenix-orange.jpg",
        hex: "#c97844",
        isOriginal: false,
        available: true,
      },
      {
        name: "Jade Green",
        image: "/img/paintings/fol-jade-green.jpg",
        hex: "#88a37d",
        isOriginal: false,
        available: true,
      },
      {
        name: "Pearl Pink",
        image: "/img/paintings/fol-pearl-pink.jpg",
        hex: "#b598a8",
        isOriginal: false,
        available: true,
      },
    ],
  },
  {
    id: "slipper-orchids",
    title: "Mandala of 30 Slipper Orchids",
    year: "2001",
    collection: "genesis",
    size: "50 × 50 cm (approx. 20 × 20 in)",
    description:
      "The Lady's Slipper Orchid is Britain's rarest native wildflower. One wild plant remains in England. Its location is kept secret. It is guarded around the clock by Natural England.\n\nDarwin spent years studying its pouch, the distinctive curved lip that traps visiting insects, coats them in pollen, then releases them to carry it elsewhere. Plant and insect co-evolved across millions of years until neither could exist without the other. A mechanism of such precision that Darwin used as evidence of evolution itself.\n\nThirty is the number of days in the moon's cycle, the number of degrees in each sign of the zodiac, and the age at which Christ began his ministry. Stephen counted thirty of these flowers and placed each one with the same precision that the flower itself embodies.\n\nFrom a distance, the composition reads like a frost crystal or a nebula. Up close, each orchid is identifiable, its pouch and petals exact.\n\nThe orchid has been collected, coveted and nearly lost. Stephen returned it to abundance.",
    colourways: [
      {
        name: "Nebula Purple",
        image: "/img/paintings/orchids30-nebula-purple.jpg",
        hex: "#4422a0",
        isOriginal: true,
        available: true,
      },
      {
        name: "Lightning Blue",
        image: "/img/paintings/orchids30-lightning-blue.jpg",
        hex: "#9bb6e0",
        isOriginal: false,
        available: true,
      },
      {
        name: "Garnet Red",
        image: "/img/paintings/orchids30-garnet-red.jpg",
        hex: "#6b1a18",
        isOriginal: false,
        available: true,
      },
      {
        name: "Manipura Yellow",
        image: "/img/paintings/orchids30-manipura-yellow.jpg",
        hex: "#dfc56a",
        isOriginal: false,
        available: true,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // BORN IN THE SKY
  // -------------------------------------------------------------------------
  {
    id: "peacock-minerva",
    title: "The Peacock Mandala — Pavo Cristatus — Shield of Minerva",
    year: "2006–2007",
    collection: "born-in-the-sky",
    size: "65 × 65 cm (approx. 26 × 26 in)",
    description:
      "The peacock carries more symbolic weight than almost any other creature. It is the national bird of India. Krishna wears its feather. In Greek mythology, when Hermes killed the hundred-eyed giant Argus Panoptes, Hera placed all one hundred of his eyes onto the tail of the peacock, which is why each feather bears an eye. In alchemy, the cauda pavonis, the peacock's tail, marks the moment of transformation made visible. In early Christianity, the peacock symbolised resurrection. Its flesh was thought to be incorruptible.\n\nStephen knew all of this. And in 2006, the peacock sent him a feather.\n\nHe worked on it for over a year. Minerva's aegis was a shield covered in eyes. The peacock's tail is the same. Stephen saw the connection and named the painting accordingly.\n\nThe peacock finds the sun. The sun finds the painter. The painter finds the feather.",
    artistQuote:
      "In 2006 the new canvas was primed and ready. I needed inspiration, so one afternoon a good friend and I decided to take a Sunday circular walk up to Wolstonbury Hill from Hurstpierpoint Village in East Sussex. On returning to my car, and to my complete astonishment, a clean and shiny Peacock feather was caught under the tyre. Unbeknownst to me, one Peacock male had just recently escaped his Stately Home. He had made a home on the roof of a brand new garden conservatory recently constructed in the village. I was lost for words, knowing already that the Peacock was a great Solar / Sun / Son symbol as well as being the national bird of India.",
    colourways: [
      {
        name: "Persian Indigo",
        image: "/img/paintings/peacock-persian-indigo.jpg",
        hex: "#2a3c7d",
        isOriginal: true,
        available: true,
      },
      {
        name: "Blood Moon Red",
        image: "/img/paintings/peacock-blood-moon-red.jpg",
        hex: "#7a1d1c",
        isOriginal: false,
        available: true,
      },
      {
        name: "Sahara Sand Yellow",
        image: "/img/paintings/peacock-sahara-sand-yellow.jpg",
        hex: "#d2b07a",
        isOriginal: false,
        available: true,
      },
      {
        name: "Moroccan Purple",
        image: "/img/paintings/peacock-moroccan-purple.jpg",
        hex: "#3d1e5e",
        isOriginal: false,
        available: true,
      },
    ],
  },
  {
    id: "ophiuchus",
    title: "Ophiuchus",
    year: "2006",
    collection: "born-in-the-sky",
    size: "60 × 80 cm (approx. 24 × 32 in)",
    description:
      "There are thirteen constellations through which the ecliptic passes. The Babylonians used twelve, one for each month. Ophiuchus, through which the sun travels for eighteen days between November and December, was left out. It has been the excluded thirteenth ever since.\n\nOphiuchus is the Serpent Bearer. In Greek mythology, he is Asclepius, son of Apollo, who became so skilled in healing that he could raise the dead. Zeus killed him with a thunderbolt for upsetting the natural order, then placed him in the sky as a constellation, holding a serpent in both hands.\n\nThe Rod of Asclepius, a single serpent coiled around a staff, remains the global symbol of medicine. The serpent was chosen because its venom is simultaneously poison and cure. The same substance kills and heals. Asclepius understood that there is no such thing as a toxin that is only a toxin.\n\nStephen built this painting on a square — the Tibetan mandala palace form, four gates facing four directions, the sacred architecture of the cosmos. Most of his mandalas are circular. This one is not. The excluded constellation demanded a different kind of space.\n\nStephen described it as his homage to Ophiuchus, the constellation of the serpent bearer and toxin protector.",
    colourways: [
      {
        name: "Original",
        image: "/img/paintings/ophiuchus-original.jpg",
        hex: "#1a1330",
        isOriginal: true,
        available: true,
      },
    ],
  },
  {
    id: "tridecagon-moon-star",
    title: "Tridecagon Moon Star — Star of Messier 13",
    year: "2007",
    collection: "born-in-the-sky",
    size: "65 × 65 cm (approx. 26 × 26 in)",
    description:
      "In 1974, scientists pointed the Arecibo radio telescope at Messier 13, the Great Globular Cluster in Hercules, 300,000 stars, 25,000 light-years away, and broadcast the most ambitious message humanity has ever sent into space. It contained our DNA, our form, our solar system, our numbers. The message is still travelling. It will arrive in approximately 24,975 years.\n\nStephen named this painting after that cluster and built it on thirteen.\n\nThere are thirteen full moons in a solar year. The Gregorian calendar erased one.\n\nMutable: the astrological word for signs of transition, for things that change form rather than hold it. Thirteen is the number of the cycle that refuses to stay fixed. It waxes and wanes. It cannot be suppressed by a calendar.",
    artistQuote:
      "This 13-pointed star (Tridecagon) was painted to celebrate the divine feminine through soft, mutable pastel colours. Reflecting the light of the ever-changing moon. The numerology of 13 is seldom acknowledged in temple architecture.",
    colourways: [
      {
        name: "Sage Green",
        image: "/img/paintings/tridecagon-sage-green.jpg",
        hex: "#9bab86",
        isOriginal: true,
        available: true,
      },
      {
        name: "Moonstone Blue",
        image: "/img/paintings/tridecagon-moonstone-blue.jpg",
        hex: "#b8c7d1",
        isOriginal: false,
        available: true,
      },
      {
        name: "Rose Quartz",
        image: "/img/paintings/tridecagon-rose-quartz.jpg",
        hex: "#d2a8a8",
        isOriginal: false,
        available: true,
      },
      {
        name: "Supernova Violet",
        image: "/img/paintings/tridecagon-supernova-violet.jpg",
        hex: "#8a7fd2",
        isOriginal: false,
        available: true,
      },
      {
        name: "Coral Reef",
        image: "/img/paintings/tridecagon-coral-reef.jpg",
        hex: "#dcb39e",
        isOriginal: false,
        available: true,
      },
    ],
  },
  {
    id: "lulin",
    title: "Lulin",
    year: "2012",
    collection: "born-in-the-sky",
    size: "65 × 65 cm (approx. 26 × 26 in)",
    description:
      "On 24 February 2009, a green comet made its closest approach to Earth. It came within 38 million miles, glowing green from cyanogen and diatomic carbon burning in its atmosphere. Cyanogen is a poisonous gas. It makes one of the most beautiful colours in the night sky.\n\nComet Lulin was discovered in 2007 by a nineteen-year-old Chinese student named Ye Quanzhi, studying a photograph taken at the Lulin Observatory in Taiwan. He noticed something that wasn't a star. No one had seen it before, because it had never been here before. This was Comet Lulin's first visit to the inner solar system, its first exposure to sunlight. It moved backwards, retrograde, against the direction of every planet.\n\nIt orbits the sun once every million years. It will not return.\n\nStephen painted it three years after its passing. A portrait of something most people missed entirely, already gone, made permanent.",
    colourways: [
      {
        name: "Original",
        image: "/img/paintings/lulin-original.jpg",
        hex: "#7da383",
        isOriginal: true,
        available: true,
      },
    ],
  },
  {
    id: "enneagon-swans",
    title: "Enneagon — The Swans",
    year: "[ DATE ]", // [TBD] — mum will fill in
    collection: "born-in-the-sky",
    size: "65 × 65 cm (approx. 26 × 26 in)",
    description:
      "The constellation of Cygnus has exactly nine principal stars. Stephen looked up, counted them, and came home to paint this.\n\nIn Hindu tradition, the swan is hamsa, the carrier of the soul. The word itself is the sound of breathing: ham as you breathe in, sa as you breathe out. Every person alive is saying the swan's name without knowing it.\n\nIn Celtic mythology swans moved between worlds. In Greek tradition, they were Apollo's birds, and when the sun god was gone, they sang.\n\nTwo swans facing each other make a heart with their necks. Stephen placed nine such pairs inside this mandala and called it a painting of global consciousness.\n\nHe meant it.",
    artistQuote:
      "The mandala of 18 Golden Swans holding 9 hearts between 9 pairs whose feathers touch just so. A painting born in the sky and with the knowledge of the 9 key Stars that light the constellation of Cygnus. This mandala of global consciousness is engineered around an Enneagon or 9 sided polygon so the geometry within forms the Enneagram or nine-pointed star. We are each other.",
    colourways: [
      {
        name: "Cygnus Gold",
        image: "/img/paintings/enneagon-cygnus-gold.jpg",
        hex: "#caa54a",
        isOriginal: true,
        available: true,
      },
      {
        name: "Glacier Blue",
        image: "/img/paintings/enneagon-glacier-blue.jpg",
        hex: "#a8c8c5",
        isOriginal: false,
        available: true,
      },
      {
        name: "Solstice Orange",
        image: "/img/paintings/enneagon-solstice-orange.jpg",
        hex: "#c97a3d",
        isOriginal: false,
        available: true,
      },
      {
        name: "Antique Pink",
        image: "/img/paintings/enneagon-antique-pink.jpg",
        hex: "#b48590",
        isOriginal: false,
        available: true,
      },
      {
        name: "Velvet Purple",
        image: "/img/paintings/enneagon-velvet-purple.jpg",
        hex: "#5e3d6e",
        isOriginal: false,
        available: true,
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export const getPaintingById = (id: string): Painting | undefined =>
  PAINTINGS.find((p) => p.id === id);

export const getPaintingsByCollection = (collectionId: Collection["id"]): Painting[] =>
  PAINTINGS.filter((p) => p.collection === collectionId);
