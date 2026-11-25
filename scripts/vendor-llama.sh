#!/bin/sh
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMMIT="dc33e6131e3f93ed388bc1132780d5728f3ad857"
SHA_FILE="$ROOT/modules/pyrohorns-llama/cpp/llama.cpp.sha256"
EXPECTED="$(cut -d' ' -f1 "$SHA_FILE")"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://github.com/andriydruk/llama.cpp-android/archive/${COMMIT}.tar.gz" -o "$TMP/llama.tar.gz"
ACTUAL="$(sha256sum "$TMP/llama.tar.gz" | cut -d' ' -f1)"
if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "ERROR: la huella del tarball no coincide (esperada $EXPECTED, obtenida $ACTUAL)" >&2
  exit 1
fi
tar -xzf "$TMP/llama.tar.gz" -C "$TMP"
SRC="$TMP/llama.cpp-android-$COMMIT"
DST="$ROOT/modules/pyrohorns-llama/cpp/llama.cpp"
rm -rf "$DST"
mkdir -p "$DST"
cp "$SRC/CMakeLists.txt" "$SRC/LICENSE" "$SRC/AUTHORS" "$DST/"
for dir in cmake common ggml include src vendor; do
  cp -r "$SRC/$dir" "$DST/$dir"
done
# Soporte de la arquitectura `dory` (ggml-org/llama.cpp#30306, aún sin aceptar), adaptado a este commit. Solo src/ y common/.
patch -p1 -d "$DST" < "$ROOT/modules/pyrohorns-llama/cpp/patches/dory.patch"
echo "llama.cpp $COMMIT vendimizado en $DST"
