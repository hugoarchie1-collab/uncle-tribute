#!/bin/bash
# pavo-tapestry.sh — the ZOOMED-OUT Pavo (Peacock Minerva) backdrop family
# for Home + About (Hugo 2026-07-02: "every single colourway zoomed out
# properly as much as possible… seamlessly blended").
#
# Per colourway, TWO baked layers (no runtime CSS blur — scroll-perf rule):
#   pavo-<c>-fill-v1.webp   — heavy gaussian ambient wash (sigma 26 @ 1100px),
#                             brightness-normalised, the bg-cover surround.
#   pavo-<c>-whole-v1.webp  — the ENTIRE painting at 1400px, light gaussian
#                             (sigma 3.5 — painting clearly reads, text stays
#                             legible over the per-section scrims), feathered
#                             alpha edge (~6%) so it melts into the fill,
#                             brightness-normalised to the family target.
#
# NORMALISATION: sources span mean-luma 71→178 (yellow/pink are ~2.4× the
# indigo). Each image is multiplied toward a shared family target so the
# scroll crossfade never jumps bright→dark (the "seamless blend" requirement).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=public/img/paintings
OUT=public/img/paintings

# colour slug : source luma (measured) — targets below
COLOURS="persian-indigo blood-moon-red sahara-sand-yellow moroccan-purple mary-pink"

WHOLE_TARGET=62   # mean luma of the whole-painting layer (visible, never glaring)
FILL_TARGET=44    # surround stays quieter than the painting

for c in $COLOURS; do
  src="$SRC/peacock-$c.jpg"
  luma=$(magick "$src" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)

  # --- whole painting, zoomed out, feathered alpha edge ---
  wb=$(python3 -c "print(round(100*$WHOLE_TARGET/$luma))")
  # feather: alpha ramp over the outer 6% of each edge (rounded by blurring a
  # slightly-inset white-on-black mask)
  magick "$src" -resize 1400x1400 -gaussian-blur 0x3.5 -modulate "$wb,92,100" \
    \( +clone -alpha extract -fill black -colorize 100 \
       -fill white -draw "roundrectangle 42,42 1357,1357 60,60" \
       -gaussian-blur 0x28 \) \
    -alpha off -compose CopyOpacity -composite \
    -define webp:alpha-quality=90 -strip -quality 86 "$OUT/pavo-$c-whole-v1.webp"

  # --- ambient fill (heavy blur of the same painting) ---
  fb=$(python3 -c "print(round(100*$FILL_TARGET/$luma))")
  magick "$src" -resize 1100x1100 -gaussian-blur 0x26 -modulate "$fb,88,100" \
    -strip -quality 80 "$OUT/pavo-$c-fill-v1.webp"

  wl=$(magick "$OUT/pavo-$c-whole-v1.webp" -background '#141018' -alpha remove -alpha off -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  fl=$(magick "$OUT/pavo-$c-fill-v1.webp" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  sz_w=$(du -h "$OUT/pavo-$c-whole-v1.webp" | cut -f1)
  sz_f=$(du -h "$OUT/pavo-$c-fill-v1.webp" | cut -f1)
  echo "$c: src=$luma whole=$wl ($sz_w) fill=$fl ($sz_f)"
done
