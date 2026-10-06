const path = require("node:path");
const fs = require("node:fs");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// Also support dependency-only symlinks when developing the local package.
const dependencyRoots = ["expo", "react-native", "react", "@dagrejs/dagre"].map((name) => {
  const parent = path.dirname(
    path.dirname(fs.realpathSync(require.resolve(`${name}/package.json`))),
  );
  return name.startsWith("@") ? path.dirname(parent) : parent;
});
config.watchFolders = [path.resolve(__dirname, ".."), ...dependencyRoots];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../node_modules"),
  ...dependencyRoots,
];
config.resolver.disableHierarchicalLookup = true;
module.exports = config;
