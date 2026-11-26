#!/bin/sh
# Copia whisper.cpp (MIT) al módulo nativo. Solo lo necesario para la CPU de Android; los backends de GPU se omiten.
# Versión y huella fijadas: si no coincide la descarga, no se copia nada.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="v1.9.6"
EXPECTED="7ab15dc88022d2425ad94dcffd8abbf1b6d7018089b4e48d6b40780738e0b445"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://github.com/ggml-org/whisper.cpp/archive/refs/tags/${TAG}.tar.gz" -o "$TMP/whisper.tar.gz"
ACTUAL="$(sha256sum "$TMP/whisper.tar.gz" | cut -d' ' -f1)"
if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "ERROR: la huella de whisper.cpp ${TAG} no coincide (esperada $EXPECTED, obtenida $ACTUAL)" >&2
  exit 1
fi
tar -xzf "$TMP/whisper.tar.gz" -C "$TMP"
SRC="$TMP/whisper.cpp-${TAG#v}"
DST="$ROOT/modules/pyrohorns-llama/cpp/whisper.cpp"
rm -rf "$DST"
mkdir -p "$DST/ggml/src"
cp "$SRC/CMakeLists.txt" "$SRC/LICENSE" "$DST/"
cp -r "$SRC/cmake" "$SRC/src" "$SRC/include" "$DST/"
cp "$SRC/ggml/CMakeLists.txt" "$DST/ggml/"
# Plantillas que el CMake lee con configure_file (aunque no se usen en Android).
mkdir -p "$DST/bindings/javascript"
cp "$SRC/bindings/javascript/package-tmpl.json" "$DST/bindings/javascript/"
cp -r "$SRC/ggml/cmake" "$SRC/ggml/include" "$DST/ggml/"
# Backends de GPU y de otras plataformas: no se compilan en Android/CPU.
cd "$SRC/ggml/src"
for item in *; do
  case "$item" in
    ggml-cuda|ggml-vulkan|ggml-hexagon|ggml-opencl|ggml-metal|ggml-sycl|ggml-webgpu|ggml-cann|ggml-musa|ggml-rpc|ggml-openvino|ggml-zdnn|ggml-blas|ggml-kompute|ggml-virtgpu|ggml-hip|ggml-snapdragon|ggml-qnn) ;;
    *) cp -r "$item" "$DST/ggml/src/" ;;
  esac
done
echo "whisper.cpp ${TAG} vendimizado en $DST"
