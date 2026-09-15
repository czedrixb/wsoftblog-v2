import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.E2E_PORT || "3100";
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shares one seeded Postgres DB; keep it deterministic
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // The target editor (WOS-312 §5/§6) is a Korean-locale browser — the
    // admin's language detection is Accept-Language-driven, so simulate
    // that instead of the runner's default en-US.
    locale: "ko-KR",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        // NEXT_PUBLIC_SERVER_URL must equal the origin the browser drives:
        // Payload derives its CSRF origin allowlist from it, and a mismatch
        // 403s every admin write (the old "prod-only Save Draft" bug).
        env: { PORT, NEXT_PUBLIC_SERVER_URL: baseURL },
      },
});
