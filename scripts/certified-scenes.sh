#!/bin/bash
# certified-scenes.sh — deploy Hugo's CERTIFIED BACKGROUND IMAGES folder
# (Desktop/THE MANDALA COMPANY FOLDER) as the page-scene backdrops, one
# baked webp per certified file (2026-07-02, Hugo: "access and deploy").
#
# Recipe: resize to 1200px height → sigma-4 gaussian (the unified site blur —
# scene clearly visible, text legible via SCENE_SCRIM) → per-image brightness
# normalisation to a shared asset mean-luma target (SceneBackdrop then lifts
# ×1.38 in CSS and lays SCENE_SCRIM ᾱ≈0.39 on top → composited ≈ 0.84·L+2.7,
# so L=30 lands the approved ~26-28 composited band on EVERY image) → a light
# baked top gradient so the nav strip never sits on a bright sky.
# NEW -v2 filenames: /img is immutable-cached 1yr.
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
  magick "$in" -resize x1200 -gaussian-blur 0x4 -modulate "$br,85,100" \
    \( -size "${iw}x${gh}" gradient:"rgba(0,0,0,0.22)-rgba(0,0,0,0)" \
       -background none -gravity north -extent "${iw}x${ih}" \) \
    -compose over -composite \
    -background '#080706' -alpha remove -alpha off -strip -quality 84 "$out"
  local l comp
  l=$(magick "$out" -resize 400x400 -colorspace Gray -format "%[fx:mean*255]" info:)
  comp=$(python3 -c "print(round(0.84*$l+2.7,1))")
  printf "%-24s %-9s asset=%-6.1f composited≈%-5s (%s)\n" "$2" "${iw}x${ih}" "$l" "$comp" "$(du -h "$out" | cut -f1)"
}

gen "authenicate page background.webp"              auth-scene-v2
gen "contact page background.jpeg"                  contact-scene-v2
gen "FAQ background 1.webp"                         faq-scene-a-v2
gen "FAQ background 2 .jpeg"                        faq-scene-b-v2
gen "find a print for you page background.webp"     foryou-scene-v2
gen "gift card page background.webp"                gift-scene-v2
gen "hbjgdyftgws.jpeg"                              notfound-scene-v2
gen "memories page background.jpeg"                 memories-scene-v2
gen "news page background.webp"                     news-scene-v2
gen "privacy background 1.jpeg"                     privacy-scene-a-v2
gen "privacy background 2.jpeg"                     privacy-scene-b-v2
gen "returns background 1.jpeg"                     returns-scene-a-v2
gen "returns background 2.jpeg"                     returns-scene-b-v2
gen "terms background 1.jpeg"                       terms-scene-a-v2
gen "terms background 2.webp"                       terms-scene-b-v2
gen "trade and interior design page background.webp" trade-scene-v2
gen "Your account page background.jpeg"             account-scene-v2
gen "Your basket page background .webp"             basket-scene-v2
