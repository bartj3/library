import { defineConfig, devices } from "@playwright/test";

const testLibraryFile = `/tmp/book-library-test-${Date.now()}.json`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command:
      `LIBRARY_DATA_FILE=${testLibraryFile} BOOK_METADATA_MOCKS_FILE=./tests/e2e/book-metadata-mocks.json npm run start -- --hostname 127.0.0.1 --port 3001`,
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
