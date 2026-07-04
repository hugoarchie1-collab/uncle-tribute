#!/bin/bash
# scenes-v5.sh — targeted -v5 re-bakes (Hugo 2026-07-04).
#   basket:  "blur the basket background way more" — heavy gaussian 0x18 (the
#            certified text-safe bar is 0x7); dreamy wash that recedes fully.
#   account: swap to the misty temple-arches-at-dawn certified scene (the old
#            account image echoed the home Earth); standard text-safe 0x7 bake.
# Same luma-normalise-to-30 + baked top-gradient recipe as certified-scenes-v3.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="/Users/archiehugo/Desktop/THE MANDALA COMPANY FOLDER/CERTIFIED BACKGROUND IMAGES"
OUT=public/img/scenes
TARGET=30

gen () { # gen <certified filename> <out stem> <sigma>
  local in="$SRC/$1" out="$OUT/$2.webp" sigma="$3"
  local luma br
  luma=$(magick "$in" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  br=$(python3 -c "print(min(160, round(100*$TARGET/$luma)))")
  read iw ih <<< "$(magick "$in" -resize x1200 -format "%w %h" info:)"
  local gh=$(( ih * 40 / 100 ))
  magick "$in" -resize x1200 -gaussian-blur 0x${sigma} -modulate "$br,85,100" \
    \( -size "${iw}x${gh}" gradient:"rgba(0,0,0,0.22)-rgba(0,0,0,0)" \
       -background none -gravity north -extent "${iw}x${ih}" \) \
    -compose over -composite \
    -background '#080706' -alpha remove -alpha off -strip -quality 84 "$out"
  local l s
  l=$(magick "$out" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  s=$(magick "$out" -resize 400x400 -colorspace Gray -format "%[fx:standard_deviation*255]" info:)
  printf "%-18s sigma=%-3s %sx%s luma=%-5.1f stddev=%-5.1f (%s)\n" "$2" "$sigma" "$iw" "$ih" "$l" "$s" "$(du -h "$out"|cut -f1)"
}

gen "Your basket page background .webp"                basket-scene-v5   18
gen "trade and interior design page background.webp"  account-scene-v5  7
