#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Garg Jewellers — Media optimisation script
#
# Run this once before deploying to shrink videos and images.
# Requires: ffmpeg (brew install ffmpeg) + sharp CLI (npm install -g sharp-cli)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

VIDEOS_DIR="public/videos"
IMAGES_DIR="public/images"

echo "====================================================="
echo "  Garg Jewellers — Media Optimiser"
echo "====================================================="

# ─── Videos ──────────────────────────────────────────────────────────────────
# Convert 53 MB .MOV → compressed .webm (~2-4 MB) + .mp4 (~3-6 MB)
# Target: 720p, CRF 28 (good quality, small file), strip audio (muted anyway)

if command -v ffmpeg &>/dev/null; then
  echo ""
  echo "▶ Converting videos…"
  for MOV in "$VIDEOS_DIR"/*.MOV "$VIDEOS_DIR"/*.mov; do
    [ -f "$MOV" ] || continue
    BASE="${MOV%.*}"

    # WebM (VP9) — best compression, supported by all modern browsers
    if [ ! -f "${BASE}.webm" ]; then
      echo "  → ${BASE}.webm"
      ffmpeg -i "$MOV" \
        -c:v libvpx-vp9 \
        -crf 32 -b:v 0 \
        -vf "scale=1280:-2" \
        -an \
        -deadline good -cpu-used 2 \
        -y "${BASE}.webm"
    else
      echo "  ✓ ${BASE}.webm (already exists)"
    fi

    # MP4 (H.264) — Safari / older browser fallback
    if [ ! -f "${BASE}.mp4" ]; then
      echo "  → ${BASE}.mp4"
      ffmpeg -i "$MOV" \
        -c:v libx264 \
        -crf 26 -preset slow \
        -vf "scale=1280:-2" \
        -an \
        -movflags +faststart \
        -y "${BASE}.mp4"
    else
      echo "  ✓ ${BASE}.mp4 (already exists)"
    fi
  done
  echo "  Videos done."
else
  echo ""
  echo "⚠  ffmpeg not found. Install with:  brew install ffmpeg"
  echo "   Then re-run this script to convert the 53 MB .MOV files."
fi

# ─── Images ──────────────────────────────────────────────────────────────────
# Convert large JPEGs/PNGs to WebP and resize oversized images.
# Targets: ≤ 1920 px wide, WebP quality 80.

echo ""
echo "▶ Optimising images…"

# List of the worst offenders (raw DSLR shots)
LARGE_IMAGES=(
  "DSC05539.JPG"
  "DSC05613.JPG"
  "journey-then.jpg"
  "owners-founders.jpg"
  "instagram-necklace-new.jpg"
  "instagram-rings-new.jpg"
  "instagram-style-new.jpg"
  "new-arrival-1.jpg"
  "new-arrival-2.jpg"
  "new-arrival-3.jpg"
  "new-arrival-4.jpg"
  "logo-new.png"
  "name-logo2.png"
  "name-logo.png"
)

if command -v ffmpeg &>/dev/null; then
  for IMG in "${LARGE_IMAGES[@]}"; do
    SRC="$IMAGES_DIR/$IMG"
    [ -f "$SRC" ] || continue
    EXT="${IMG##*.}"
    BASE="${IMG%.*}"
    DEST="$IMAGES_DIR/${BASE}.webp"
    if [ ! -f "$DEST" ]; then
      echo "  → $DEST"
      ffmpeg -i "$SRC" \
        -vf "scale='min(1920,iw)':-2" \
        -q:v 80 \
        -y "$DEST" 2>/dev/null
    else
      echo "  ✓ $DEST (already exists)"
    fi
  done
elif command -v sips &>/dev/null; then
  echo "  Using macOS sips for basic compression (ffmpeg preferred)…"
  for IMG in "${LARGE_IMAGES[@]}"; do
    SRC="$IMAGES_DIR/$IMG"
    [ -f "$SRC" ] || continue
    BASE="${IMG%.*}"
    DEST="$IMAGES_DIR/${BASE}.webp"
    if [ ! -f "$DEST" ]; then
      echo "  → $DEST"
      sips -s format webp --resampleHeightWidthMax 1920 "$SRC" --out "$DEST" 2>/dev/null || true
    fi
  done
else
  echo "  ⚠  No image converter found."
  echo "     Install with:  brew install ffmpeg"
fi

# ─── Journey images ───────────────────────────────────────────────────────────
if command -v ffmpeg &>/dev/null; then
  for IMG in "$IMAGES_DIR/journey"/*.{JPG,jpg,PNG,png}; do
    [ -f "$IMG" ] || continue
    BASE="${IMG%.*}"
    DEST="${BASE}.webp"
    if [ ! -f "$DEST" ]; then
      echo "  → $DEST"
      ffmpeg -i "$IMG" \
        -vf "scale='min(1920,iw)':-2" \
        -q:v 80 -y "$DEST" 2>/dev/null
    fi
  done
fi

echo ""
echo "====================================================="
echo "  Done! Check public/videos/*.webm and public/images/*.webp"
echo "  Then update component <source> / <img src> to point to the"
echo "  new WebP/WebM files."
echo "====================================================="
