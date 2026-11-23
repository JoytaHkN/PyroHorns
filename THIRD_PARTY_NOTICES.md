# Avisos de terceros

PyroHorns se distribuye bajo la licencia **GPL-3.0-only** (ver `LICENSE`). Incluye o usa los
siguientes componentes de terceros, cada uno con su propia licencia.

## Código copiado de otros proyectos

| Proyecto | Licencia | Uso |
|---|---|---|
| llama.cpp, fork `andriydruk/llama.cpp-android` fijado en `dc33e6131e3f93ed388bc1132780d5728f3ad857` | MIT | Código fuente vendimizado en `modules/pyrohorns-llama/cpp/llama.cpp`, con su `LICENSE` y `AUTHORS`. Se compila en el APK para la inferencia local. |
| LMPlayground (`andriydruk/LMPlayground`, MIT) | MIT | Referencia para el diseño del binding JNI y la configuración CMake/NDK; no se copia código de ella. |
| and-code (MIT) | MIT | Referencia de producto y entorno; no se copia código. |

De Agora (GPL-3.0) no se copia nada.

## Componentes incluidos en la app

| Componente | Licencia |
|---|---|
| React, React DOM, React Native, react-native-web | MIT |
| Expo y sus módulos (expo-router, expo-sqlite, expo-secure-store, expo-crypto, expo-file-system, expo-font, expo-blur, expo-haptics, expo-linear-gradient, expo-linking, expo-splash-screen, expo-status-bar, expo-constants, @expo/metro-runtime) | MIT |
| heroui-native | Apache-2.0 |
| Uniwind, Tailwind CSS, tailwind-merge, tailwind-variants | MIT |
| react-native-reanimated, react-native-worklets, react-native-gesture-handler, react-native-screens, react-native-safe-area-context, react-native-svg, react-native-keyboard-controller | MIT |
| @lodev09/react-native-true-sheet, @radix-ui/react-dialog, @radix-ui/react-presence | MIT |
| @react-native-async-storage/async-storage, zustand | MIT |
| SQLCipher Community Edition (vía expo-sqlite) | BSD (Zetetic LLC) |
| SQLite (vía SQLCipher) | Dominio público |
| OpenSSL 3.3 (vía expo-sqlite, para SQLCipher) | Apache-2.0 |
| Fuentes Outfit y JetBrains Mono (@expo-google-fonts) | SIL Open Font License 1.1 |

## Herramientas de desarrollo (no van dentro de la app)

TypeScript (Apache-2.0), esbuild (MIT), Babel (MIT).
