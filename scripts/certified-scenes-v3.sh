#!/bin/bash
# certified-scenes-v3.sh — TEXT-SAFE re-bake of the certified page scenes
# (Hugo 2026-07-02: "blurring enough so you can professionally read all
# elements — text, images etc — on screen").
#
# Identical to certified-scenes.sh (v2 recipe: x1200, luma-normalised to 30,
# baked top gradient) except gaussian 0x4 → 0x7 and -v2 → -v3 stems.
# Also brings the three still-referenced OLD v1 scenes (search-path,
# order-nile, orders-autumn) to the same -v3 bar from their committed assets.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="/Users/archiehugo/Desktop/THE MANDALA COMPANY FOLDER/CERTIFIED BACKGROUND IMAGES"
OUT=public/img/scenes
TARGET=30

gen () { # gen <certified filename> <out stem>
  local in="$SRC/$1" out="$OUT/$2.webp"
  local luma br
  luma=$(magick "$in" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  br=$(python3 -c "print(min(160, round(100*$TARGET/$luma)))")
  read iw ih <<< "$(magick "$in" -resize x1200 -format "%w %h" info:)"
  local gh=$(( ih * 40 / 100 ))
  magick "$in" -resize x1200 -gaussian-blur 0x7 -modulate "$br,85,100" \
    \( -size "${iw}x${gh}" gradient:"rgba(0,0,0,0.22)-rgba(0,0,0,0)" \
       -background none -gravity north -extent "${iw}x${ih}" \) \
    -compose over -composite \
    -background '#080706' -alpha remove -alpha off -strip -quality 84 "$out"
  local l s comp
  l=$(magick "$out" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  s=$(magick "$out" -resize 400x400 -colorspace Gray -format "%[fx:standard_deviation*255]" info:)
  comp=$(python3 -c "print(round(0.84*$l+2.7,1))")
  printf "%-24s %-9s asset=%-6.1f stddev=%-6.1f composited≈%-5s (%s)\n" "$2" "${iw}x${ih}" "$l" "$s" "$comp" "$(du -h "$out" | cut -f1)"
}

gen "authenicate page background.webp"              auth-scene-v3
gen "contact page background.jpeg"                  contact-scene-v3
gen "FAQ background 1.webp"                         faq-scene-a-v3
gen "FAQ background 2 .jpeg"                        faq-scene-b-v3
gen "find a print for you page background.webp"     foryou-scene-v3
gen "gift card page background.webp"                gift-scene-v3
gen "hbjgdyftgws.jpeg"                              notfound-scene-v3
gen "memories page background.jpeg"                 memories-scene-v3
gen "news page background.webp"                     news-scene-v3
gen "privacy background 1.jpeg"                     privacy-scene-a-v3
gen "privacy background 2.jpeg"                     privacy-scene-b-v3
gen "returns background 1.jpeg"                     returns-scene-a-v3
gen "returns background 2.jpeg"                     returns-scene-b-v3
gen "terms background 1.jpeg"                       terms-scene-a-v3
gen "terms background 2.webp"                       terms-scene-b-v3
gen "trade and interior design page background.webp" trade-scene-v3
gen "Your account page background.jpeg"             account-scene-v3
gen "Your basket page background .webp"             basket-scene-v3

# --- the three still-referenced OLD v1 scenes: same text-safe bar, from the
# committed assets (already blurred+darkened once — add the differential blur
# to reach ≈ sigma 7 total; no further brightness change beyond the clamp) ---
old () { # old <existing v1 stem>  -> <stem minus -v1>-v3
  local in="$OUT/$1.webp" stem="${1%-v1}" ; local out="$OUT/$stem-v3.webp"
  magick "$in" -gaussian-blur 0x5.7 -strip -quality 84 "$out"
  local l s
  l=$(magick "$out" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  s=$(magick "$out" -resize 400x400 -colorspace Gray -format "%[fx:standard_deviation*255]" info:)
  printf "%-24s asset=%-6.1f stddev=%-6.1f (%s)\n" "$stem-v3" "$l" "$s" "$(du -h "$out" | cut -f1)"
}
old search-path-scene-v1
old order-nile-scene-v1
old orders-autumn-scene-v1
