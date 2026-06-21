const { spawn } = require("node:child_process");

const defaults = {
  frontendUrl: "http://localhost:3000",
  kongUrl: "http://localhost:8000",
  gamesUrl: "http://localhost:4001",
  walletsUrl: "http://localhost:4002",
  keycloakUrl: "http://localhost:8080",
  realm: "crash-game",
  clientId: "crash-game-client",
  username: "player",
  password: "player123",
};

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...(options.env || {}) },
      shell: process.platform === "win32",
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const rendered = [command, ...args].join(" ");
      reject(new Error(`${rendered} exited with code ${code}${stderr ? `\n${stderr}` : ""}`));
    });
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? safeJson(text) : undefined;

  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} returned ${response.status}: ${text}`);
  }

  return body;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function waitFor(name, action, options = {}) {
  const timeoutMs = options.timeoutMs || 120000;
  const intervalMs = options.intervalMs || 3000;
  const started = Date.now();
  let lastError;

  while (Date.now() - started < timeoutMs) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      process.stdout.write(`Waiting for ${name}...\n`);
      await sleep(intervalMs);
    }
  }

  throw new Error(`${name} did not become ready within ${timeoutMs}ms: ${lastError?.message}`);
}

async function waitForConsecutive(name, action, options = {}) {
  const requiredSuccesses = options.requiredSuccesses || 3;
  let successes = 0;

  return waitFor(
    name,
    async () => {
      await action();
      successes += 1;

      if (successes < requiredSuccesses) {
        throw new Error(`observed ${successes}/${requiredSuccesses} consecutive successes`);
      }
    },
    options,
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

function assertCondition(label, condition, details) {
  if (!condition) {
    throw new Error(`${label} failed${details ? `: ${details}` : ""}`);
  }
}

async function getKeycloakToken() {
  const url = `${defaults.keycloakUrl}/realms/${defaults.realm}/protocol/openid-connect/token`;
  const form = new URLSearchParams({
    grant_type: "password",
    client_id: defaults.clientId,
    username: defaults.username,
    password: defaults.password,
  });
  const token = await fetchJson(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!token?.access_token) {
    throw new Error("Keycloak token response did not include access_token");
  }

  return token.access_token;
}

function decodeJwtPayload(token) {
  const [, payload] = token.split(".");

  if (!payload) {
    return {};
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

function printFailure(error, diagnostic) {
  console.error("\n[failed]", error.message);

  if (diagnostic) {
    console.error("\nTry:");
    console.error(`  ${diagnostic}`);
  }
}

module.exports = {
  assertCondition,
  assertEqual,
  decodeJwtPayload,
  defaults,
  fetchJson,
  getKeycloakToken,
  printFailure,
  run,
  sleep,
  waitFor,
  waitForConsecutive,
};
