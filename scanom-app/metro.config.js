const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow .svg files to be imported as React components
const { assetExts, sourceExts } = config.resolver;
config.resolver.assetExts = assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...sourceExts, "svg"];

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

module.exports = config;
