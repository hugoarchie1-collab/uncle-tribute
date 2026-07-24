#!/bin/bash
# =============================================================================
# frame-photos.sh — build PHOTOREAL frame previews from Point 101's OWN moulding
# photography, so every PDP frame preview matches Point 101 exactly.
#
# Point 101 photograph each moulding as four straight rail images (top / left /
# bottom / right) served from /images/products/frames/. We download the TOP rail
# per frame and mitre it into a 1200×1200 9-slice border-image with a
# transparent centre (identical pipeline to frame-mouldings.sh, real photo rails
# instead of colour recipes). FramedPreview.tsx applies it via border-image.
#
# ⚠️ Source imagery is Point 101's (we resell their framing). Raw rails are NOT
# committed — this script fetches them on demand. Output ships as
# public/img/frames/<id>-frame-v2.webp (immutable cache → bump -vN on re-bake).
#
# Regenerate:  bash scripts/frame-photos.sh
# =============================================================================
set -e
S=1200; M=170
BASE="https://www.point101.com/images/products/frames"
OUT="public/img/frames"; TMP="$(mktemp -d)"; mkdir -p "$OUT"

# our frame id | Point 101 TOP-rail filename stem (from their frame gallery)
MAP=$(cat <<'EOF'
black-lacquer|1618_black-fl-10-top
stained-black|5557_black-wood-top
walnut-tray|1580_walnut-sq-20-top
walnut-grain|1584_walnutgra-fl-19-top
wenge|1681_wenge-sq-22-top
natural-oak|2858_1609-oak-fl-20-top
ash|2850_1623-ash-cu-15-top
white|2145_whitelac-ch-38-top
white-stained|5565_white-wood-top
silver|1562_silver-sq-20-top
gold|1551_gold-fl-22-top
silver-aluminium|5577_aluminium-shinny-top
black-aluminium|5583_aluminium-black-top
box-black|2459_black-frames-top
box-oak|2168_top
ayous-gold|2243_top
ornate-gold|1599_gold-sh-60-top
EOF
)

build () {
  local id="$1" rail="$2"
  magick "$rail" -resize ${S}x${M}\! "$TMP/rail.png"
  magick -size ${S}x${S} xc:none "$TMP/rail.png"                  -gravity North -composite "$TMP/s-top.png"
  magick -size ${S}x${S} xc:none \( "$TMP/rail.png" -rotate 90 \)  -gravity East  -composite "$TMP/s-right.png"
  magick -size ${S}x${S} xc:none \( "$TMP/rail.png" -rotate 180 \) -gravity South -composite "$TMP/s-bottom.png"
  magick -size ${S}x${S} xc:none \( "$TMP/rail.png" -rotate 270 \) -gravity West  -composite "$TMP/s-left.png"
  magick -size ${S}x${S} xc:black -fill white -draw "polygon 0,0 ${S},0 $((S-M)),${M} ${M},${M}"               "$TMP/k-top.png"
  magick -size ${S}x${S} xc:black -fill white -draw "polygon ${S},0 ${S},${S} $((S-M)),$((S-M)) $((S-M)),${M}" "$TMP/k-right.png"
  magick -size ${S}x${S} xc:black -fill white -draw "polygon ${S},${S} 0,${S} ${M},$((S-M)) $((S-M)),$((S-M))" "$TMP/k-bottom.png"
  magick -size ${S}x${S} xc:black -fill white -draw "polygon 0,${S} 0,0 ${M},${M} ${M},$((S-M))"               "$TMP/k-left.png"
  for s in top right bottom left; do
    magick "$TMP/s-$s.png" "$TMP/k-$s.png" -alpha off -compose CopyOpacity -composite "$TMP/mm-$s.png"
  done
  magick "$TMP/mm-top.png" "$TMP/mm-right.png" -composite "$TMP/mm-bottom.png" -composite "$TMP/mm-left.png" -composite "$TMP/$id.png"
  magick "$TMP/$id.png" -quality 88 -define webp:method=6 "$OUT/$id-frame-v2.webp"
}

echo "$MAP" | while IFS='|' read -r id stem; do
  [ -z "$id" ] && continue
  curl -sf -A "Mozilla/5.0" "$BASE/$stem.jpg" -o "$TMP/$id.jpg"
  build "$id" "$TMP/$id.jpg"
  echo "  baked $id"
done
echo "wrote:"; ls -1 "$OUT"/*-frame-v2.webp
rm -rf "$TMP"
