#!/bin/bash
# pavo-tapestry-v2.sh — TEXT-SAFE re-bake of the Pavo tapestry (Hugo
# 2026-07-02: "blurring enough so you can professionally read all elements —
# text, images etc — on screen").
#
# Changes vs pavo-tapestry.sh (v1):
#   whole layer: gaussian 0x3.5 → 0x9 (no crisp edges under cream type; the
#                painting still clearly reads zoomed-out) and WHOLE_TARGET
#                62 → 56 (type never sits on a bright patch).
#   fill layer:  recipe unchanged (already a sigma-26 ambient wash) — only the
#                filename bumps so the family stays one -v2 generation.
#   names:       -v1 → -v2 (/img is immutable-cached 1yr — never overwrite).
#
# v1's run died before mary-pink, so pavo-mary-pink-*-v1 never existed — this
# run generates ALL FIVE colourways including it.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=public/img/paintings
OUT=public/img/paintings

COLOURS="persian-indigo blood-moon-red sahara-sand-yellow moroccan-purple mary-pink"

WHOLE_TARGET=56   # mean luma of the whole-painting layer (visible, never glaring)
FILL_TARGET=44    # surround stays quieter than the painting

for c in $COLOURS; do
  src="$SRC/peacock-$c.jpg"
  luma=$(magick "$src" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)

  # --- whole painting, zoomed out, feathered alpha edge ---
  wb=$(python3 -c "print(round(100*$WHOLE_TARGET/$luma))")
  magick "$src" -resize 1400x1400 -gaussian-blur 0x9 -modulate "$wb,92,100" \
    \( +clone -alpha extract -fill black -colorize 100 \
       -fill white -draw "roundrectangle 42,42 1357,1357 60,60" \
       -gaussian-blur 0x28 \) \
    -alpha off -compose CopyOpacity -composite \
    -define webp:alpha-quality=90 -strip -quality 86 "$OUT/pavo-$c-whole-v2.webp"

  # --- ambient fill (heavy blur of the same painting) ---
  fb=$(python3 -c "print(round(100*$FILL_TARGET/$luma))")
  magick "$src" -resize 1100x1100 -gaussian-blur 0x26 -modulate "$fb,88,100" \
    -strip -quality 80 "$OUT/pavo-$c-fill-v2.webp"

  wl=$(magick "$OUT/pavo-$c-whole-v2.webp" -background '#141018' -alpha remove -alpha off -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  ws=$(magick "$OUT/pavo-$c-whole-v2.webp" -background '#141018' -alpha remove -alpha off -resize 400x400 -colorspace Gray -format "%[fx:standard_deviation*255]" info:)
  fl=$(magick "$OUT/pavo-$c-fill-v2.webp" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  sz_w=$(du -h "$OUT/pavo-$c-whole-v2.webp" | cut -f1)
  sz_f=$(du -h "$OUT/pavo-$c-fill-v2.webp" | cut -f1)
  echo "$c: src=$luma whole=$wl stddev=$ws ($sz_w) fill=$fl ($sz_f)"
done
