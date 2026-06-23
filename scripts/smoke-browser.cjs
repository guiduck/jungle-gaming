const fs = require("node:fs/promises");
const path = require("node:path");
const { defaults, fetchJson, printFailure, sleep, waitFor, waitForConsecutive } = require("./demo-common.cjs");

const artifactDir = path.join(process.cwd(), "output", "playwright");
const frontendUrl = process.env.SMOKE_FRONTEND_URL || defaults.frontendUrl;
const keycloakUrl = process.env.SMOKE_KEYCLOAK_URL || defaults.keycloakUrl;
const kongUrl = process.env.SMOKE_KONG_URL || defaults.kongUrl;
const frontendOrigin = new URL(frontendUrl).origin;
const keycloakOrigin = new URL(keycloakUrl).origin;

const suggestedDiagnostics = [
  "npm run demo:up",
  "docker compose ps",
  "docker compose logs --tail 120 keycloak",
  "docker compose logs --tail 120 frontend",
  "docker compose logs --tail 120 games",
  "docker compose logs --tail 120 wallets",
];

async function main() {
  const { chromium } = loadPlaywright();

  await preflight();

  let browser;
  let page;
  try {
    browser = await chromium.launch({ headless: process.env.SMOKE_BROWSER_HEADED !== "true" });
    const context = await browser.newContext();
    page = await context.newPage();

    await step("frontend public welcome", async () => {
      await page.goto(frontendUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      const hasStoredToken = await page.evaluate(() => Boolean(window.localStorage.getItem("jungle.accessToken")));
      if (hasStoredToken) {
        throw new Error("clean browser context unexpectedly contains jungle.accessToken");
      }

      await page.locator('[data-smoke="public-welcome"]').waitFor({ timeout: 15000 });
      await page.locator('[data-smoke="welcome-modal"]').waitFor({ timeout: 15000 });
      await page.locator('[data-smoke="keycloak-login-button"]').waitFor({ timeout: 15000 });
    }, page);

    await step("keycloak login", async () => {
      await page.locator('[data-smoke="keycloak-login-button"]').click();
      await page.waitForURL((url) => url.origin === keycloakOrigin, { timeout: 30000 });
      await page.locator('input[name="username"]').fill(defaults.username, { timeout: 30000 });
      await page.locator('input[name="password"]').fill(defaults.password, { timeout: 30000 });
      await page.locator('input[type="submit"], button[type="submit"]').first().click();
    }, page);

    await step("frontend authenticated shell", async () => {
      await page.waitForURL((url) => url.origin === frontendOrigin, { timeout: 60000 });
      await page.locator('[data-smoke="authenticated-shell"]').waitFor({ timeout: 60000 });

      const requiredSelectors = [
        "wallet-display",
        "websocket-status",
        "mountain-scene",
        "betting-controls",
        "round-phase",
        "current-bets",
        "leaderboard-panel",
        "history-panel",
        "my-bets-panel",
        "verification-panel",
        "show-commands",
      ];

      for (const selector of requiredSelectors) {
        await page.locator(`[data-smoke="${selector}"]`).waitFor({ timeout: 30000 });
      }
    }, page);

    console.log("\nBrowser smoke passed.");
    console.log(`frontendUrl: ${frontendUrl}`);
    console.log(`keycloakUrl: ${keycloakUrl}`);
    console.log("loginMode: keycloak-pkce");
    console.log("browser: chromium");
  } catch (error) {
    if (page) {
      await captureFailureArtifact(page, "browser-smoke-failure");
    }
    throw error;
  } finally {
    await browser?.close();
  }
}

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    throw new Error(
      [
        "Playwright is not installed.",
        "Run `npm install` to restore dependencies, then `npx playwright install chromium` if Chromium is missing.",
        error.message,
      ].join("\n"),
    );
  }
}

async function preflight() {
  await waitFor("Frontend", async () => {
    const response = await fetch(frontendUrl);
    if (!response.ok) {
      throw new Error(`Frontend returned ${response.status}`);
    }
  }, { timeoutMs: 60000, intervalMs: 3000 });

  await waitFor("Keycloak OIDC discovery", async () => {
    await fetchJson(`${keycloakUrl}/realms/${defaults.realm}/.well-known/openid-configuration`);
  }, { timeoutMs: 180000, intervalMs: 5000 });

  await waitForConsecutive("Games Kong health", () => fetchJson(`${kongUrl}/games/health`), {
    requiredSuccesses: 2,
    timeoutMs: 90000,
    intervalMs: 3000,
  });

  await waitForConsecutive("Wallets Kong health", () => fetchJson(`${kongUrl}/wallets/health`), {
    requiredSuccesses: 2,
    timeoutMs: 90000,
    intervalMs: 3000,
  });
}

async function step(name, action, page) {
  try {
    console.log(`Checking ${name}...`);
    await action();
  } catch (error) {
    if (page) {
      await captureFailureArtifact(page, safeArtifactName(name));
    }
    throw new Error(`${name} failed: ${error.message}`);
  }
}

async function captureFailureArtifact(page, name) {
  await fs.mkdir(artifactDir, { recursive: true });
  const filePath = path.join(artifactDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.error(`screenshot: ${filePath}`);
  console.error(`currentUrl: ${page.url()}`);
  console.error("diagnostics:");
  for (const command of suggestedDiagnostics) {
    console.error(`  ${command}`);
  }
}

function safeArtifactName(value) {
  return `browser-smoke-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

main().catch(async (error) => {
  printFailure(error, "npm run demo:up");
  if (String(error.message).includes("Executable doesn't exist")) {
    console.error("\nInstall the Chromium browser binary with:");
    console.error("  npx playwright install chromium");
  }
  await sleep(0);
  process.exitCode = 1;
});
