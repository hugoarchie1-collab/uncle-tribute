#!/bin/bash
# luma-scene.sh — measure a scene backdrop's brightness AS THE VISITOR SEES IT:
# composited under the exact page scrim. Prints full-frame + top-40% mean luma (0-255).
#
# Approved-dark band: full ≈ 18–23, top40 ≈ 18–24.
# (refs: genesis-v2 20.2/21.6, contact-autumn-v4 20.4/23.0, memories-plumage-v4 21.4/23.9)
# NB: judge blur VISUALLY at matched brightness — Laplacian variance is not a valid
# cross-image blur metric here (it is contaminated by brightness/contrast).
#
# Usage: luma-scene.sh <image>
set -euo pipefail
img="$1"
read W H <<< "$(magick identify -format "%w %h" "$img")"
G="gradient:rgba(8,7,6,0.38)-rgba(8,7,6,0.80)"
# -alpha remove -alpha off so any source transparency can't skew the mean
full=$(magick "$img" -background '#080706' -alpha remove -alpha off \
  \( -size "${W}x${H}" $G \) -compose over -composite \
  -colorspace Gray -format "%[fx:mean*255]" info:)
topH=$(( H * 40 / 100 ))
top=$(magick "$img" -background '#080706' -alpha remove -alpha off \
  \( -size "${W}x${H}" $G \) -compose over -composite \
  -gravity North -crop "${W}x${topH}+0+0" +repage \
  -colorspace Gray -format "%[fx:mean*255]" info:)
printf "%-44s full=%-7.2f top40=%-7.2f\n" "$(basename "$img")" "$full" "$top"
