#!/bin/bash
# blur-scene.sh — the canonical page-scene backdrop recipe.
#
# Clones the exact treatment baked into every /img/scenes/*-blur-v*.webp:
#   resize to 1200px height  →  gaussian blur  →  modulate darker+desaturated
#   →  baked top-down black gradient (tames bright sky-bands)  →  opaque webp q84
#
# The page then renders this under the shared scrim
#   linear-gradient(180deg, rgba(8,7,6,0.38) 0%, rgba(8,7,6,0.60) 42%, rgba(8,7,6,0.80) 100%)
# so the COMPOSITED result must land in the approved-dark band (Hugo's rule:
# a backdrop must never out-shout the cream text). Validate with luma-scene.sh:
#   target full ≈ 18–23, top40 ≈ 18–24  (refs: genesis-v2 20.2/21.6, contact-v4 20.4/23.0)
#
# Usage: blur-scene.sh <src> <out.webp> [sigma] [brightness%] [saturation%] [topAlpha]
#   defaults: sigma=9 brightness=42 saturation=58 topAlpha=0.55
set -euo pipefail
src="$1"; out="$2"; sig="${3:-9}"; br="${4:-42}"; sat="${5:-58}"; ta="${6:-0.55}"
read iw ih <<< "$(magick "$src" -resize x1200 -format "%w %h\n" info:)"
gh=$(( ih * 55 / 100 ))   # top gradient covers the top 55% of the frame
magick "$src" -resize x1200 -gaussian-blur 0x"${sig}" -modulate "${br},${sat},100" \
  \( -size "${iw}x${gh}" gradient:"rgba(0,0,0,${ta})-rgba(0,0,0,0)" \
     -background none -gravity north -extent "${iw}x${ih}" \) \
  -compose over -composite \
  -background '#080706' -alpha remove -alpha off -strip -quality 84 "$out"
echo "wrote $out  (${iw}x${ih}  sigma=${sig} br=${br} sat=${sat} top=${ta})"
