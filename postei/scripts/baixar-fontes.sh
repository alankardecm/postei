#!/usr/bin/env bash
# Baixa a Inter (SIL Open Font License - uso comercial liberado) para assets/fontes.
# A VPS nao tem fontconfig; o satori le o .ttf direto, entao o arquivo precisa existir.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/fontes"
mkdir -p "$DIR"

BASE="https://github.com/google/fonts/raw/main/ofl/inter"
curl -fsSL "$BASE/Inter%5Bopsz%2Cwght%5D.ttf" -o "$DIR/Inter-Variable.ttf" || true

# Fallback: releases oficiais da Inter com pesos estaticos.
if [ ! -s "$DIR/Inter-Regular.ttf" ]; then
  TMP=$(mktemp -d)
  curl -fsSL "https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip" -o "$TMP/inter.zip"
  unzip -q -o "$TMP/inter.zip" -d "$TMP"
  find "$TMP" -name "Inter-Regular.ttf" -exec cp {} "$DIR/Inter-Regular.ttf" \; -quit
  find "$TMP" -name "Inter-Bold.ttf" -exec cp {} "$DIR/Inter-Bold.ttf" \; -quit
  rm -rf "$TMP"
fi

ls -lh "$DIR"
