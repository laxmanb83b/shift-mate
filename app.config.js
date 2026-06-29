// Dynamic Expo config. Reads the static values from app.json (passed in as
// `config`) and injects the web base URL from the environment so the build
// works under a GitHub Pages sub-path (e.g. /shiftmate/). Locally EXPO_BASE_URL
// is unset, so baseUrl stays "" and the app runs at the root.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    baseUrl: process.env.EXPO_BASE_URL ?? "",
  },
});
