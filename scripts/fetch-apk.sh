#!/bin/sh
# Descarga el APK de la última compilación en verde de main, lo comprueba y lo deja en APK IA/apk/ con su huella.
# Uso: sh scripts/fetch-apk.sh <nombre>   → PyroHorns-0.1.0-<nombre>-prueba.apk
set -eu
[ $# -eq 1 ] || { echo "Uso: sh scripts/fetch-apk.sh <nombre>"; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SRC"
set -- "$1" $(gh run list --workflow android.yml --branch main --status success --limit 1 --json databaseId,headSha --jq '.[0] | "\(.databaseId) \(.headSha)"')
NAME="PyroHorns-0.1.0-$1-prueba.apk"
OUT="$SRC/../apk/$NAME"
[ ! -e "$OUT" ] || { echo "Ya existe $OUT"; exit 1; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh run download "$2" --dir "$TMP"
APK="$(find "$TMP" -name '*.apk' | head -1)"
python3 -I "$SRC/scripts/check-apk.py" "$APK" --sha "$3"
cp "$APK" "$OUT"
( cd "$SRC/../apk" && sha256sum "$NAME" > "$NAME.sha256" )
echo "→ $OUT (commit $3)"
