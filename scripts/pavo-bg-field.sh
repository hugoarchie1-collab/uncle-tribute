#!/bin/bash
# pavo-bg-field.sh — "invent the space behind the circle" (Hugo 2026-07-03).
#
# Overwrites pavo-<c>-fill-v3.webp with the painting's OWN coloured background
# extended to a full-bleed field: the four CORNER patches (pure petal
# background — the circle never reaches the corners) are mirrored into a
# seamless 2x2 block, tiled to 2048², heavy-blurred and luma-matched to the
# whole-plate family target. Unlike a blurred copy of the whole painting,
# this surround contains NO ghost mandala — it reads as the painting's
# background genuinely expanded to the screen edges.
#
# Run ONLY before the -v3 names ship (immutable /img cache: never overwrite a
# deployed filename).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=public/img/paintings
OUT=public/img/paintings
COLOURS="persian-indigo blood-moon-red sahara-sand-yellow moroccan-purple mary-pink"
BG_TARGET=56   # match pavo-tapestry-v3.sh's WHOLE_TARGET so plate+field are one image

for c in $COLOURS; do
  src="$SRC/peacock-$c.jpg"
  luma=$(magick "$src" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  read W H <<< "$(magick identify -format "%w %h" "$src")"
  P=$(( W * 16 / 100 ))   # ~16% corner patch — safely outside the circle
  bb=$(python3 -c "print(round(100*$BG_TARGET/$luma))")
  magick "$src" -crop "${P}x${P}+0+0" +repage /tmp/pvf-tl.png
  magick "$src" -crop "${P}x${P}+$((W-P))+0" +repage -flop /tmp/pvf-tr.png
  magick "$src" -crop "${P}x${P}+0+$((H-P))" +repage -flip /tmp/pvf-bl.png
  magick "$src" -crop "${P}x${P}+$((W-P))+$((H-P))" +repage -rotate 180 /tmp/pvf-br.png
  magick \( /tmp/pvf-tl.png /tmp/pvf-tr.png +append \) \( /tmp/pvf-bl.png /tmp/pvf-br.png +append \) -append /tmp/pvf-block.png
  magick -size 2048x2048 tile:/tmp/pvf-block.png -gaussian-blur 0x14 -modulate "$bb,90,100" \
    -strip -quality 80 "$OUT/pavo-$c-fill-v3.webp"
  fl=$(magick "$OUT/pavo-$c-fill-v3.webp" -resize 300x300 -colorspace Gray -format "%[fx:mean*255]" info:)
  echo "$c: bg-field luma=$fl ($(du -h "$OUT/pavo-$c-fill-v3.webp" | cut -f1))"
done
rm -f /tmp/pvf-tl.png /tmp/pvf-tr.png /tmp/pvf-bl.png /tmp/pvf-br.png /tmp/pvf-block.png
