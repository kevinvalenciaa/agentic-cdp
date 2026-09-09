// pnpm-workspace Metro wiring: watch the repo root so rebuilds of
// @lift/sdk / @lift/protocol dist hot-reload, and resolve through both the
// app's node_modules and the root store (pnpm symlinks).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const config = getDefaultConfig(__dirname);
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.join(__dirname, "node_modules"), path.join(root, "node_modules")];

// pnpm gives some transitive packages (@expo-google-fonts/*) their own React copy,
// which on web means two Reacts in one bundle and "Invalid hook call". Pin every
// react / react-dom request to the app's copy.
const singletons = ["react", "react-dom"];
const baseResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pkg = singletons.find((name) => moduleName === name || moduleName.startsWith(`${name}/`));
  if (pkg) {
    const pinned = path.join(__dirname, "node_modules", moduleName);
    return context.resolveRequest({ ...context, originModulePath: __filename }, pinned, platform);
  }
  return baseResolve ? baseResolve(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
