const {defineConfig} = require('cypress');

module.exports = defineConfig({
  e2e: {
    specPattern: 'src/__tests__/e2e/integration/**/*.spec.ts',
    supportFile: 'src/__tests__/e2e/support/index.ts',
    fixturesFolder: 'src/__tests__/e2e/fixtures',
    screenshotsFolder: 'src/__tests__/e2e/screenshots',
    videosFolder: 'src/__tests__/e2e/videos',
    baseUrl: 'http://localhost:3000',
    testIsolation: false,
  },
});
