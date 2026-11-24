// ggml elige en ejecución la mejor variante de CPU (libggml-cpu-*.so) abriendo la carpeta de bibliotecas nativas,
// así que deben estar extraídas como archivos reales y no dentro del APK (expo.useLegacyPackaging=true).
const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withLegacyPackaging(config) {
  return withGradleProperties(config, (c) => {
    const items = c.modResults;
    const entry = { type: 'property', key: 'expo.useLegacyPackaging', value: 'true' };
    const i = items.findIndex((x) => x.type === 'property' && x.key === 'expo.useLegacyPackaging');
    if (i >= 0) items[i] = entry;
    else items.push(entry);
    return c;
  });
};
