#!/bin/sh
# Firma un APK en la CI con la clave de prelanzamiento guardada en los secretos de GitHub (S16-A, P31-M8).
# La clave solo existe en $RUNNER_TEMP mientras se ejecuta este script. Uso: sh scripts/sign-apk.sh entrada.apk salida.apk
set -eu
[ $# -eq 2 ] || { echo "Uso: sh scripts/sign-apk.sh entrada.apk salida.apk"; exit 1; }
: "${KEYSTORE_BASE64:?Falta el secreto ANDROID_KEYSTORE_BASE64}"
KS="$RUNNER_TEMP/release.jks"
ALIGNED="$RUNNER_TEMP/aligned.apk"
trap 'rm -f "$KS" "$ALIGNED"' EXIT
echo "$KEYSTORE_BASE64" | base64 -d > "$KS"
BT=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
"$BT/zipalign" -f -p 4 "$1" "$ALIGNED"
"$BT/apksigner" sign --ks "$KS" --ks-pass env:KEYSTORE_PASSWORD --ks-key-alias "$KEY_ALIAS" --key-pass env:KEY_PASSWORD \
  --out "$2" "$ALIGNED"
"$BT/apksigner" verify --print-certs "$2"
