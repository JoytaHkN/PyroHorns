// Configuración dinámica sobre app.json.
// En GitHub Pages la PWA (visor online, D4) vive en /PyroHorns: el workflow define EXPO_BASE_URL.
// En los APK, la CI define PYROHORNS_SHA, PYROHORNS_BUILD_NUMBER y PYROHORNS_BUILD_DATE (P31-M4).
module.exports = ({ config }) => {
  const { EXPO_BASE_URL: baseUrl, PYROHORNS_SHA: sha, PYROHORNS_BUILD_DATE: date } = process.env;
  const number = Number(process.env.PYROHORNS_BUILD_NUMBER) || 0;
  return {
    ...config,
    ...(number > 0 ? { android: { ...config.android, versionCode: number } } : {}),
    ...(sha ? { extra: { ...config.extra, build: { sha, number, date } } } : {}),
    ...(baseUrl ? { experiments: { ...config.experiments, baseUrl } } : {}),
  };
};
