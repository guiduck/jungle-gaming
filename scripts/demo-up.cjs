const {
  defaults,
  fetchJson,
  getKeycloakToken,
  printFailure,
  run,
  waitFor,
  waitForConsecutive,
} = require("./demo-common.cjs");

async function main() {
  await ensureDocker();

  const env = {
    DEMO_DETERMINISTIC_ROUNDS: "true",
    DEMO_ROUND_SERVER_SEED: "jungle-smoke-seed-2026",
    DEMO_ROUND_NONCE: "smoke-round",
  };

  console.log("Starting Jungle Crash Game demo stack...");
  await run("docker", ["compose", "up", "-d"], { env });

  console.log("Verifying repeatable migrations...");
  await run("docker", ["compose", "run", "--rm", "games-migrations"], { env });
  await run("docker", ["compose", "run", "--rm", "wallets-migrations"], { env });

  await waitFor("Games direct health", () => fetchJson(`${defaults.gamesUrl}/health`));
  await waitFor("Wallets direct health", () => fetchJson(`${defaults.walletsUrl}/health`));
  await waitForConsecutive("Games Kong health", () => fetchJson(`${defaults.kongUrl}/games/health`), {
    requiredSuccesses: 3,
  });
  await waitForConsecutive("Wallets Kong health", () => fetchJson(`${defaults.kongUrl}/wallets/health`), {
    requiredSuccesses: 3,
  });
  await waitFor("Frontend", async () => {
    const response = await fetch(defaults.frontendUrl);
    if (!response.ok) {
      throw new Error(`Frontend returned ${response.status}`);
    }
  });
  await waitFor("Keycloak token endpoint", () => getKeycloakToken(), {
    timeoutMs: 180000,
    intervalMs: 5000,
  });

  printSummary();
}

async function ensureDocker() {
  try {
    await run("docker", ["compose", "version"], { capture: true });
  } catch (error) {
    throw new Error(`Docker Compose is unavailable. ${error.message}`);
  }

  try {
    await run("docker", ["info"], { capture: true });
  } catch (error) {
    throw new Error(
      `Docker is installed but the engine is not ready. Start Docker Desktop and retry.\n${error.message}`,
    );
  }
}

function printSummary() {
  console.log("\nJungle Crash Game demo is ready.");
  console.log(`frontendUrl: ${defaults.frontendUrl}`);
  console.log(`kongUrl: ${defaults.kongUrl}`);
  console.log(`gamesSwaggerUrl: ${defaults.gamesUrl}/docs`);
  console.log(`walletsSwaggerUrl: ${defaults.walletsUrl}/docs`);
  console.log(`keycloakUrl: ${defaults.keycloakUrl}`);
  console.log(`gamesHealthUrl: ${defaults.gamesUrl}/health and ${defaults.kongUrl}/games/health`);
  console.log(`walletsHealthUrl: ${defaults.walletsUrl}/health and ${defaults.kongUrl}/wallets/health`);
  console.log(`demoUsername: ${defaults.username}`);
  console.log(`demoPassword: ${defaults.password}`);
  console.log(`realm: ${defaults.realm}`);
  console.log(`clientId: ${defaults.clientId}`);
  console.log("nextCommands:");
  console.log("  npm run smoke:api");
  console.log("  docker compose logs --tail 120 games wallets");
}

main().catch((error) => {
  printFailure(error, "docker compose ps");
  process.exitCode = 1;
});
