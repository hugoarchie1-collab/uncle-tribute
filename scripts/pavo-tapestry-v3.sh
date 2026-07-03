#!/bin/bash
# pavo-tapestry-v3.sh — SEAMLESS FULL-SCREEN re-bake (Hugo 2026-07-03:
# "more blurry — you can barely read text — and the painting has to fill the
# entire screen… expand the background of the pavo painting to the edges of
# the site, whole screen filled 100%").
#
# Changes vs -v2:
#   whole: gaussian 0x9 → 0x14 (text reads effortlessly; the painting still
#          reads as the zoomed-out canvas) and the feathered edge WIDENED
#          (inset 84px, mask blur 0x56 — the plate melts into the surround
#          with no visible seam or "contained square").
#   fill:  luma target 44 → 56 = SAME family target as the whole layer, so
#          the surround is the painting's own background field extended to
#          the viewport edges — one continuous image, no darker border zone.
#   names: -v2 → -v3 (/img immutable-cached — never overwrite).
# PavoBackdrop sizes the plate min(100svh,100vw) so the canvas spans the full
# viewport in its limiting axis; the matched fill covers the rest.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=public/img/paintings
OUT=public/img/paintings

COLOURS="persian-indigo blood-moon-red sahara-sand-yellow moroccan-purple mary-pink"

WHOLE_TARGET=56
FILL_TARGET=56    # match the whole layer — seamless, no dark surround band

for c in $COLOURS; do
  src="$SRC/peacock-$c.jpg"
  luma=$(magick "$src" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)

  # --- whole painting, zoomed out, WIDE feathered alpha edge ---
  wb=$(python3 -c "print(round(100*$WHOLE_TARGET/$luma))")
  magick "$src" -resize 1400x1400 -gaussian-blur 0x14 -modulate "$wb,92,100" \
    \( +clone -alpha extract -fill black -colorize 100 \
       -fill white -draw "roundrectangle 84,84 1315,1315 120,120" \
       -gaussian-blur 0x56 \) \
    -alpha off -compose CopyOpacity -composite \
    -define webp:alpha-quality=90 -strip -quality 84 "$OUT/pavo-$c-whole-v3.webp"

  # --- ambient fill: the painting's own background extended to the edges ---
  fb=$(python3 -c "print(round(100*$FILL_TARGET/$luma))")
  magick "$src" -resize 1100x1100 -gaussian-blur 0x26 -modulate "$fb,90,100" \
    -strip -quality 80 "$OUT/pavo-$c-fill-v3.webp"

  wl=$(magick "$OUT/pavo-$c-whole-v3.webp" -background '#141018' -alpha remove -alpha off -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  ws=$(magick "$OUT/pavo-$c-whole-v3.webp" -background '#141018' -alpha remove -alpha off -resize 400x400 -colorspace Gray -format "%[fx:standard_deviation*255]" info:)
  fl=$(magick "$OUT/pavo-$c-fill-v3.webp" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  echo "$c: src=$luma whole=$wl stddev=$ws fill=$fl ($(du -h "$OUT/pavo-$c-whole-v3.webp" | cut -f1)/$(du -h "$OUT/pavo-$c-fill-v3.webp" | cut -f1))"
done
