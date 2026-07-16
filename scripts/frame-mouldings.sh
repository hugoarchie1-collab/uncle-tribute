#!/bin/bash
# =============================================================================
# frame-mouldings.sh — bake photoreal picture-frame moulding assets for the PDP
# framing preview (src/components/FramedPreview.tsx, applied via border-image).
#
# Each output is a 1200×1200 PNG with a TRANSPARENT centre window: a mitred
# 4-rail moulding with a real bevel profile (outer highlight ridge → lit face →
# cove shadow → inner lip → dark rebate line), fine longitudinal wood grain
# (wood frames only), and baked top-left directional light. border-image slices
# it into 9 so corners mitre correctly at any print aspect-ratio.
#
# Regenerate:  bash scripts/frame-mouldings.sh
# Output:      public/img/frames/<id>-frame-v1.png   (immutable cache → new -vN on change)
# =============================================================================
set -e
S=1200; M=170
OUT="public/img/frames"; TMP="$(mktemp -d)"
mkdir -p "$OUT"
seg () { magick -size 1x"$1" gradient:"$2"-"$3" miff:-; }

# build_frame <id> <grainPct> <dirLo> <dirHi> <edge> <seg1a seg1b> ... 6 stops (12 colours) + rebate colour
build_frame () {
  local id="$1" grain="$2" dlo="$3" dhi="$4" edge="$5"; shift 5
  local c1a=$1 c1b=$2 c2a=$3 c2b=$4 c3a=$5 c3b=$6 c4a=$7 c4b=$8 c5a=$9 c5b=${10} reb=${11}
  {
    seg $((M*8/100))  "$c1a" "$c1b"
    seg $((M*16/100)) "$c2a" "$c2b"
    seg $((M*36/100)) "$c3a" "$c3b"
    seg $((M*22/100)) "$c4a" "$c4b"
    seg $((M*15/100)) "$c5a" "$c5b"
    seg $((M*3/100))  "$reb" "$reb"
  } | magick - -append "$TMP/col.png"
  magick "$TMP/col.png" -resize ${S}x${M}\! "$TMP/rail.png"
  # crisp outer edge (2px) so the moulding has a defined boundary against the
  # wall instead of a bright glowing rim.
  magick "$TMP/rail.png" -fill "$edge" -draw "rectangle 0,0 $((S-1)),2" "$TMP/rail.png"
  if [ "$grain" -gt 0 ]; then
    magick -size ${S}x${M} xc:gray50 -attenuate 0.5 +noise Gaussian -colorspace Gray \
      -motion-blur 0x70+0 -level 42%,58% "$TMP/grain.png"
    magick "$TMP/rail.png" "$TMP/grain.png" -compose overlay -define compose:args=${grain} -composite "$TMP/rail.png"
  fi
  magick -size ${S}x${S} xc:none \( "$TMP/rail.png" \)            -gravity North -composite "$TMP/s-top.png"
  magick -size ${S}x${S} xc:none \( "$TMP/rail.png" -rotate 90 \)  -gravity East  -composite "$TMP/s-right.png"
  magick -size ${S}x${S} xc:none \( "$TMP/rail.png" -rotate 180 \) -gravity South -composite "$TMP/s-bottom.png"
  magick -size ${S}x${S} xc:none \( "$TMP/rail.png" -rotate 270 \) -gravity West  -composite "$TMP/s-left.png"
  magick -size ${S}x${S} xc:black -fill white -draw "polygon 0,0 ${S},0 $((S-M)),${M} ${M},${M}"                 "$TMP/k-top.png"
  magick -size ${S}x${S} xc:black -fill white -draw "polygon ${S},0 ${S},${S} $((S-M)),$((S-M)) $((S-M)),${M}"   "$TMP/k-right.png"
  magick -size ${S}x${S} xc:black -fill white -draw "polygon ${S},${S} 0,${S} ${M},$((S-M)) $((S-M)),$((S-M))"   "$TMP/k-bottom.png"
  magick -size ${S}x${S} xc:black -fill white -draw "polygon 0,${S} 0,0 ${M},${M} ${M},$((S-M))"                 "$TMP/k-left.png"
  for s in top right bottom left; do
    magick "$TMP/s-$s.png" "$TMP/k-$s.png" -alpha off -compose CopyOpacity -composite "$TMP/mm-$s.png"
  done
  magick "$TMP/mm-top.png" "$TMP/mm-right.png" -composite "$TMP/mm-bottom.png" -composite "$TMP/mm-left.png" -composite "$TMP/frame.png"
  magick "$TMP/frame.png" -alpha extract "$TMP/a.png"
  magick -size ${S}x${S} -define gradient:angle=135 gradient:"$dhi"-"$dlo" "$TMP/dir.png"
  magick "$TMP/frame.png" "$TMP/dir.png" -compose Overlay -composite "$TMP/a.png" -alpha off -compose CopyOpacity -composite "$TMP/$id.png"
  # ship as WebP (border-image-source) — ~15–30 KB vs ~3 MB PNG, no visible loss
  magick "$TMP/$id.png" -quality 84 -define webp:method=6 "$OUT/$id-frame-v1.webp"
}

#            id            grain  dirLo     dirHi     edge      highlight  ->  face          ->  mid          ->  cove          ->  innerlip           rebate
build_frame natural-oak    22 '#5e5e5e' '#c4c4c4'  '#7a5a30'  '#e2d0a2' '#d6bf90'  '#d6bf90' '#c6a46e'  '#c6a46e' '#a3814c'  '#a3814c' '#6a4f2e'  '#6a4f2e' '#93714080'  '#2c2013'
build_frame walnut-tray    22 '#4e4e4e' '#bcbcbc'  '#1c110a'  '#7e5a3d' '#6e4d33'  '#6e4d33' '#5e4230'  '#5e4230' '#3f2c1e'  '#3f2c1e' '#1f130c'  '#1f130c' '#4a332280'  '#140b06'
build_frame stained-black  12 '#646464' '#c2c2c2'  '#050403'  '#3a352f' '#2c2723'  '#2c2723' '#221e1a'  '#221e1a' '#181513'  '#181513' '#0c0b0a'  '#0c0b0a' '#1a161080'  '#050403'
build_frame white          0  '#767676' '#bcbcbc'  '#b3aa9b'  '#fbf7f0' '#f1ece3'  '#f1ece3' '#ece5da'  '#ece5da' '#ddd5c8'  '#ddd5c8' '#c0b7a8'  '#c0b7a8' '#e2dacd80'  '#a49a8b'

echo "wrote:"; ls -1 "$OUT"/*-frame-v1.webp
rm -rf "$TMP"
