#!/bin/sh
# Sincroniza el código de APK IA/PyroHorns con la caché de dependencias y ejecuta un comando allí.
# node_modules no puede vivir en /sdcard (no admite enlaces simbólicos): por eso existe la caché.
# En la caché nunca se edita nada; se puede borrar y se regenera sola.
#
# Uso:  sh scripts/sync-build.sh                                   → comprobar tipos + pruebas
#       sh scripts/sync-build.sh npx expo export --platform web    → cualquier otro comando
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DST="${PYROHORNS_BUILD:-/workspace/pyrohorns-build}"
mkdir -p "$DST"

for item in src tests scripts plugins assets app.json app.config.js babel.config.js metro.config.js global.css tsconfig.json package.json package-lock.json; do
  rm -rf "${DST:?}/$item"
  if [ -e "$SRC/$item" ]; then cp -r "$SRC/$item" "$DST/$item"; fi
done

rm -rf "${DST:?}/modules"
if [ -d "$SRC/modules" ]; then
  cp -r "$SRC/modules" "$DST/modules"
  rm -rf "$DST/modules/pyrohorns-llama/cpp/llama.cpp" "$DST/modules/pyrohorns-llama/cpp/whisper.cpp"
fi

if ! cmp -s "$SRC/package-lock.json" "$DST/.installed-lock.json"; then
  echo "→ package-lock.json cambió: npm ci en la caché"
  (cd "$DST" && npm ci --no-audit --no-fund --loglevel=error)
  cp "$SRC/package-lock.json" "$DST/.installed-lock.json"
fi

cd "$DST"
if [ "$#" -eq 0 ]; then
  npm run typecheck && npm test
else
  "$@"
fi
