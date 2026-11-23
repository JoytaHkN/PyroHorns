// Configuración dinámica sobre app.json.
// En GitHub Pages la PWA (visor online, D4) vive en /PyroHorns: el workflow define EXPO_BASE_URL.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  return baseUrl ? { ...config, experiments: { ...config.experiments, baseUrl } } : config;
};
