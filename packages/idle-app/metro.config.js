const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

// Monorepo root — Yarn 1 hoists most packages here
const monorepoRoot = path.resolve(__dirname, "../..");

const config = getDefaultConfig(__dirname, {
  // Enable CSS support for web
  isCSSEnabled: true,
});

// Yarn 1 hoists dependencies to the monorepo root node_modules.
// Metro must know to look there when EXPO_NO_METRO_WORKSPACE_ROOT is set,
// since disabling workspace root detection also removes the automatic
// node_modules resolution from the workspace root.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Add support for .wasm files (required by Skia for all platforms)
// Source: https://shopify.github.io/react-native-skia/docs/getting-started/installation/
config.resolver.assetExts.push('wasm');

// Enable inlineRequires for proper Skia and Reanimated loading
// Source: https://shopify.github.io/react-native-skia/docs/getting-started/web/
// Without this, Skia throws "react-native-reanimated is not installed" error
// This is cross-platform compatible (iOS, Android, web)
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true, // Critical for @shopify/react-native-skia
  },
});

module.exports = config;