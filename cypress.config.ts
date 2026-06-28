import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
          baseUrl: 'http://localhost:5173',
          viewportWidth: 1280,
          viewportHeight: 800,
          video: false,
          screenshotOnRunFailure: true,
          supportFile: false,
          specPattern: 'e2e/**/*.spec.ts',
          setupNodeEvents(on, config) {
                  // implement node event listeners here
          },
    },
});
