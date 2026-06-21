const crypto = require("node:crypto");
const {
  assertCondition,
  assertEqual,
  decodeJwtPayload,
  defaults,
  fetchJson,
  getKeycloakToken,
  printFailure,
  sleep,
  waitFor,
  waitForConsecutive,
} = require("./demo-common.cjs");

const betAmountCents = 250;
const cashoutMultiplierBps = 10000;

async function main() {
  await checkHealth();
  const token = await waitFor("Keycloak token", () => getKeycloakToken(), {
    timeoutMs: 120000,
    intervalMs: 5000,
  });
  const playerId = decodeJwtPayload(token).sub || defaults.username;
  const auth = { authorization: `Bearer ${token}` };

  await waitForConsecutive("Kong gateway stability", () => fetchJson(`${defaults.kongUrl}/wallets/health`), {
    requiredSuccesses: 3,
  });

  const wallet = await waitFor("wallet seed", () =>
    fetchJson(`${defaults.kongUrl}/wallets`, {
      method: "POST",
      headers: auth,
    }),
  );
  const startingBalanceCents = wallet.balanceCents;
  assertCondition("wallet starting balance", Number.isInteger(startingBalanceCents));

  const { round, bet } = await placeSmokeBet(playerId, auth);

  const postBetWallet = await fetchJson(`${defaults.kongUrl}/wallets/me`, { headers: auth });
  assertEqual("post-bet balance", postBetWallet.balanceCents, startingBalanceCents - betAmountCents);

  await ensureRoundRunning(round.id);

  let cashedOut;
  let finalExpectation;
  if (round.crashMultiplierBps > cashoutMultiplierBps) {
    cashedOut = await fetchJson(`${defaults.kongUrl}/games/bet/cashout`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ multiplierBps: cashoutMultiplierBps }),
    });
    const cashedOutBet = cashedOut.bets.find((candidate) => candidate.id === bet.id);
    assertEqual("cashout bet status", cashedOutBet?.status, "cashed_out");
    assertEqual("cashout payout", cashedOutBet?.payoutCents, betAmountCents);
    finalExpectation = startingBalanceCents;
  } else {
    finalExpectation = startingBalanceCents - betAmountCents;
  }

  const crashed = await completeRound(round.id);
  await settleIfStillCurrentCrashed(crashed.id);

  const finalWallet = await waitFor("wallet final balance", async () => {
    const current = await fetchJson(`${defaults.kongUrl}/wallets/me`, { headers: auth });
    if (current.balanceCents !== finalExpectation) {
      throw new Error(`expected balance ${finalExpectation}, got ${current.balanceCents}`);
    }
    return current;
  });

  const history = await fetchJson(`${defaults.kongUrl}/games/rounds/history`);
  assertCondition("history contains smoked round", history.items?.some((item) => item.id === crashed.id));

  const playerBets = await fetchJson(`${defaults.kongUrl}/games/bets/me`, { headers: auth });
  assertCondition("player bets contain smoked bet", JSON.stringify(playerBets).includes(bet.id));

  const verification = await fetchJson(`${defaults.kongUrl}/games/rounds/${crashed.id}/verify`);
  const verificationMatched = verifyRound(verification);
  assertCondition("verification recomputes crash", verificationMatched);

  console.log("\nAPI smoke passed.");
  console.log(`playerId: ${playerId}`);
  console.log(`roundId: ${crashed.id}`);
  console.log(`betId: ${bet.id}`);
  console.log(`startingBalanceCents: ${startingBalanceCents}`);
  console.log(`finalBalanceCents: ${finalWallet.balanceCents}`);
  console.log(`betAmountCents: ${betAmountCents}`);
  console.log(`cashoutMultiplierBps: ${cashedOut ? cashoutMultiplierBps : "not-cashed-out"}`);
  console.log(`crashMultiplierBps: ${crashed.crashMultiplierBps}`);
  console.log(`payoutCents: ${cashedOut ? betAmountCents : 0}`);
  console.log(`verificationMatched: ${verificationMatched}`);
}

async function settleIfStillCurrentCrashed(roundId) {
  const current = await fetchJson(`${defaults.kongUrl}/games/rounds/current`);

  if (current.id === roundId && current.status === "crashed") {
    await fetchJson(`${defaults.kongUrl}/games/rounds/current/settle`, { method: "POST" });
  }
}

async function ensureRoundRunning(roundId) {
  return waitFor("prepared round running", async () => {
    const current = await fetchJson(`${defaults.kongUrl}/games/rounds/current`);

    if (current.id !== roundId) {
      throw new Error(`prepared round ${roundId} is no longer current`);
    }

    if (current.status === "running") {
      return current;
    }

    if (current.status === "betting") {
      const started = await maybeFetchJson(`${defaults.kongUrl}/games/rounds/current/start`, {
        method: "POST",
      });

      if (started?.id === roundId && started.status === "running") {
        return started;
      }
    }

    throw new Error(`prepared round ${roundId} is ${current.status}`);
  }, {
    timeoutMs: 15000,
    intervalMs: 250,
  });
}

async function completeRound(roundId) {
  return waitFor("prepared round completion", async () => {
    const current = await fetchJson(`${defaults.kongUrl}/games/rounds/current`);

    if (current.id === roundId && current.status === "running") {
      const crashed = await maybeFetchJson(`${defaults.kongUrl}/games/rounds/current/crash`, {
        method: "POST",
      });

      if (crashed?.id === roundId && crashed.status === "crashed") {
        return crashed;
      }
    }

    if (current.id === roundId && current.status === "crashed") {
      return current;
    }

    const history = await fetchJson(`${defaults.kongUrl}/games/rounds/history`);
    const completed = history.items?.find((item) => item.id === roundId);

    if (completed) {
      return completed;
    }

    throw new Error(`prepared round ${roundId} is ${current.id === roundId ? current.status : "not current"}`);
  }, {
    timeoutMs: 20000,
    intervalMs: 250,
  });
}

async function maybeFetchJson(url, options) {
  try {
    return await fetchJson(url, options);
  } catch (error) {
    if (error.message.includes(" returned 400:")) {
      return undefined;
    }

    throw error;
  }
}

async function checkHealth() {
  await fetchJson(`${defaults.gamesUrl}/health`);
  await fetchJson(`${defaults.walletsUrl}/health`);
  await waitForConsecutive("Games Kong health", () => fetchJson(`${defaults.kongUrl}/games/health`), {
    requiredSuccesses: 3,
  });
  await waitForConsecutive("Wallets Kong health", () => fetchJson(`${defaults.kongUrl}/wallets/health`), {
    requiredSuccesses: 3,
  });
}

async function prepareBettingRound(playerId, auth) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = await fetchJson(`${defaults.kongUrl}/games/rounds/current`);
    const hasPlayerBet = current.bets?.some((bet) => bet.playerId === playerId);

    if (current.status === "betting" && !hasPlayerBet) {
      return current;
    }

    if (current.status === "betting" && hasPlayerBet) {
      await fetchJson(`${defaults.kongUrl}/games/rounds/current/start`, { method: "POST" });
      await fetchJson(`${defaults.kongUrl}/games/rounds/current/crash`, { method: "POST" });
      await fetchJson(`${defaults.kongUrl}/games/rounds/current/settle`, { method: "POST" });
      await sleep(500);
      continue;
    }

    if (current.status === "running") {
      await fetchJson(`${defaults.kongUrl}/games/rounds/current/crash`, { method: "POST" });
      await fetchJson(`${defaults.kongUrl}/games/rounds/current/settle`, { method: "POST" });
      await sleep(500);
      continue;
    }

    if (current.status === "crashed") {
      await fetchJson(`${defaults.kongUrl}/games/rounds/current/settle`, { method: "POST" });
      await sleep(500);
      continue;
    }

    await sleep(500);
  }

  throw new Error("Could not prepare a betting round for smoke");
}

async function placeSmokeBet(playerId, auth) {
  return waitFor("accepted smoke bet", async () => {
    await prepareBettingRound(playerId, auth);

    const placed = await maybeFetchJson(`${defaults.kongUrl}/games/bet`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ amountCents: betAmountCents }),
    });

    const bet = placed?.bets?.find((candidate) => candidate.playerId === playerId);

    if (bet?.status !== "pending") {
      throw new Error(`bet was not accepted: ${JSON.stringify(placed)}`);
    }

    return { round: placed, bet };
  }, {
    timeoutMs: 30000,
    intervalMs: 250,
  });
}

function verifyRound(round) {
  const digest = crypto
    .createHmac("sha256", round.serverSeed)
    .update(round.nonce)
    .digest("hex");
  const sample = Number.parseInt(digest.slice(0, 13), 16);
  const ratio = sample / 0x1fffffffffffff;
  const edge = (10000 - round.houseEdgeBps) / 10000;
  const multiplier = Math.max(1, edge / Math.max(0.000001, 1 - ratio));
  const crashMultiplierBps = Math.max(10000, Math.floor(multiplier * 10000));
  const hash = crypto.createHash("sha256").update(round.serverSeed).digest("hex");
  return hash === round.serverSeedHash && crashMultiplierBps === round.crashMultiplierBps;
}

main().catch((error) => {
  printFailure(error, "npm run demo:up");
  process.exitCode = 1;
});
