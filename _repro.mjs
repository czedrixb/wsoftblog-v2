import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto("http://localhost:3200/admin");
await page.waitForTimeout(1000);
console.log("Landed on:", page.url());

if (page.url().includes("create-first-user")) {
  await page.locator("#field-email").first().fill("repro@test.dev");
  await page.locator("#field-password").fill("repro-password-123");
  await page.locator("#field-confirm-password").fill("repro-password-123");
  await page.getByRole("button").last().click();
  await page.waitForURL((url) => !url.pathname.includes("create-first-user"), { timeout: 15000 });
  console.log("First user created, now at:", page.url());
} else if (page.url().includes("/login")) {
  await page.locator("#field-email").first().fill("repro@test.dev");
  await page.locator("#field-password").fill("repro-password-123");
  await page.locator("form.login__form").getByRole("button").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  console.log("Logged in, now at:", page.url());
}

await page.waitForTimeout(1000);

await page.goto("http://localhost:3200/admin/collections/posts/create");
await page.waitForTimeout(500);
const title = `Repro Post ${Date.now()}`;
await page.locator("#field-title").fill(title);
await page.waitForTimeout(400);
await page.locator("#action-save-draft").click();
await page.waitForURL(/\/admin\/collections\/posts\/\d+$/, { timeout: 15000 });
console.log("Created, now at:", page.url());

await page.waitForTimeout(1000);
await page.reload();
await page.waitForTimeout(1000);
const valueAfterReload = await page.locator("#field-title").inputValue();
console.log("TITLE AFTER RELOAD:", JSON.stringify(valueAfterReload));
console.log("EXPECTED:", JSON.stringify(title));
console.log("MATCH:", valueAfterReload === title);

await browser.close();
