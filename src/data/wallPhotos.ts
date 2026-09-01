export interface WallPhoto {
  /** Public path, e.g. "/img/walls/wild-rose-hallway.jpg". */
  src: string;
  alt: string;
  /** Optional short caption (room / owner) — never invented. */
  caption?: string;
}

/**
 * Real photos of Stephen's prints framed on real walls — DROOL's strongest
 * trust element ("As seen in real homes"). The `WallPhotos` section on the
 * product page reads this array.
 *
 * ⚠️ SHIPS EMPTY on purpose. Add entries ONLY for genuine photos the estate or
 * a buyer actually supplies — never stock, never AI, never a mockup dressed up
 * as a real home. While this is empty the section renders NOTHING, so the page
 * stays honest. To add one: drop the file in /public/img/walls/ and add a
 * `{ src, alt, caption? }` entry here.
 */
export const WALL_PHOTOS: WallPhoto[] = [];
