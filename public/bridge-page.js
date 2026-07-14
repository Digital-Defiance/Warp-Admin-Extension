(() => {
  const allowedSounds = new Set([
    "hail",
    "consoleWarning",
    "redAlert",
    "allStop",
    "dropToImpulse",
    "returnToWarp",
    "flash",
    "wormhole",
  ]);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomSeed = () => Math.floor(Math.random() * 2147483647);
  const fmtHand = (hand) => (Array.isArray(hand) ? hand.map((t) => `${t.low}:${t.high}`) : []);

  // Single long-running "job" (autoplay loop or seed search). The panel polls
  // this via the `ping` action rather than blocking on a request/response.
  const jobState = {
    name: null,
    label: "",
    running: false,
    steps: 0,
    attempts: 0,
    message: "",
    result: null,
    error: null,
    finishedAt: 0,
  };
  let stopRequested = false;
  let jobToken = 0;

  const snapshotJob = () => ({
    name: jobState.name,
    label: jobState.label,
    running: jobState.running,
    steps: jobState.steps,
    attempts: jobState.attempts,
    message: jobState.message,
    result: jobState.result,
    error: jobState.error,
  });

  const beginJob = (name, label) => {
    jobState.name = name;
    jobState.label = label;
    jobState.running = true;
    jobState.steps = 0;
    jobState.attempts = 0;
    jobState.message = "Starting…";
    jobState.result = null;
    jobState.error = null;
    jobState.finishedAt = 0;
    stopRequested = false;
    return ++jobToken;
  };

  const endJob = (patch) => {
    Object.assign(jobState, patch, { running: false, finishedAt: Date.now() });
  };

  const superseded = (token) => stopRequested || token !== jobToken;

  async function runAutoplay(mode, holdSalamander, token) {
    const lg0 = window.localGame;
    if (!lg0) return endJob({ error: "window.localGame missing — unlock first." });

    const humanId = lg0.getHumanId();
    const maxPip = lg0.getGame()?.maxPip ?? 12;
    const touchesMaxPip = (c) => c && (c.low === maxPip || c.high === maxPip);
    const chartsMaxPipTile = (a) => a?.type === "CHART_COORDINATE" && touchesMaxPip(a.coordinate);

    const pickHoldingSalamander = async (lg) => {
      const first = lg.suggestAction(mode);
      if (!first) return null;
      if (!chartsMaxPipTile(first)) {
        await lg.dispatch(first);
        return first;
      }
      for (let i = 0; i < 40; i += 1) {
        const alt = lg.suggestAction("random");
        if (!alt) break;
        if (!chartsMaxPipTile(alt)) {
          await lg.dispatch(alt);
          return alt;
        }
      }
      await lg.dispatch(first); // only maxPip charts available — forced
      return first;
    };

    lg0.resumeAI();
    const maxSteps = 500;

    while (jobState.steps < maxSteps) {
      if (superseded(token)) return endJob({ message: `Stopped after ${jobState.steps} steps.` });

      const lg = window.localGame;
      if (!lg) return endJob({ error: "window.localGame vanished — unlock again." });

      const game = lg.getGame();
      const round = game?.round;
      if (!game || game.phase !== "active" || !round) return endJob({ message: "No active game/round." });
      if (round.phase !== "playing") return endJob({ message: `Round phase is ${round.phase} — stopped.` });

      if (round.activePlayerId !== humanId) {
        await sleep(150);
        continue;
      }

      const action = holdSalamander ? await pickHoldingSalamander(lg) : await lg.playHumanAction(mode);
      if (!action) {
        lg.pauseAI();
        return endJob({ message: "Stuck — no legal human action. AI paused." });
      }

      jobState.steps += 1;
      jobState.message = `Played ${action.type} (step ${jobState.steps}).`;
      await sleep(mode === "advisor" ? 80 : 40);
    }

    endJob({ message: `Stopped after ${maxSteps} steps.` });
  }

  async function runWormholeSearch(x, token) {
    const lg = window.localGame;
    if (!lg) return endJob({ error: "window.localGame missing — unlock first." });

    const humanId = lg.getHumanId();
    const maxPip = lg.getGame()?.maxPip ?? 12;
    const maxAttempts = 1000;
    const settleMs = 200;

    const matchInHand = (hand) => {
      if (!Array.isArray(hand)) return null;
      const leadTiles = hand.filter(
        (t) => (t.low === maxPip && t.high !== maxPip) || (t.high === maxPip && t.low !== maxPip),
      );
      const doubles = hand.filter((t) => t.low === t.high && t.low !== maxPip);
      for (const tile of leadTiles) {
        const xValue = tile.low === maxPip ? tile.high : tile.low;
        if (x != null && xValue !== x) continue;
        if (doubles.some((d) => d.low === xValue)) return { xValue };
      }
      return null;
    };

    const waitForSeedChange = async (target, maxWaitMs = 3000) => {
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        if (lg.getRoundSeed() === target) return true;
        await sleep(50);
      }
      return false;
    };

    lg.resetRoundWithSeed(randomSeed());
    await sleep(settleMs);

    while (jobState.attempts < maxAttempts) {
      if (superseded(token)) return endJob({ message: `Stopped after ${jobState.attempts} attempts.` });
      jobState.attempts += 1;
      if (jobState.attempts % 25 === 0) jobState.message = `Checked ${jobState.attempts} seeds…`;

      const active = window.localGame;
      if (!active) return endJob({ error: "window.localGame vanished — unlock again." });

      const game = active.getGame();
      const hand = active.getHand();
      if (!hand || !game?.round) return endJob({ error: "No hand/round available." });

      const youGoFirst = game.round.turnOrder?.[0] === humanId;
      if (youGoFirst) {
        const hit = matchInHand(hand);
        if (hit) {
          const seed = active.getRoundSeed();
          return endJob({
            message: `Found ${maxPip}:${hit.xValue} + ${hit.xValue}:${hit.xValue} — you go first.`,
            result: { seed, hand: fmtHand(hand), label: `X = ${hit.xValue}` },
          });
        }
      }

      const next = randomSeed();
      active.resetRoundWithSeed(next);
      const changed = await waitForSeedChange(next);
      if (!changed) await sleep(settleMs);
    }

    endJob({ message: `Gave up after ${maxAttempts} attempts.` });
  }

  // kind: "swap" (0:0 + maxPip:maxPip), "salamander" (maxPip:maxPip), "blank" (0:0)
  async function runPreviewSearch(kind, token) {
    const lg = window.localGame;
    if (!lg?.previewRoundSeed) return endJob({ error: "Need previewRoundSeed — hard refresh the game tab." });

    const game = lg.getGame();
    const maxPip = game?.maxPip ?? 12;
    const roundNumber = game?.round?.roundNumber ?? 0;

    if (kind !== "blank" && roundNumber < 2) {
      return endJob({ error: `Round ${roundNumber || "?"} — Salamander is Spacedock. Advance to round 2+ first.` });
    }

    const maxAttempts = kind === "swap" ? 5000 : 2000;

    for (let i = 0; i < maxAttempts; i += 1) {
      if (superseded(token)) return endJob({ message: `Stopped after ${i} previews.` });
      jobState.attempts = i + 1;
      if ((i + 1) % 100 === 0) jobState.message = `Checked ${i + 1} previews…`;

      const preview = lg.previewRoundSeed(randomSeed());
      if (preview) {
        const hand = preview.hand || [];
        const hasSal = hand.some((t) => t.low === maxPip && t.high === maxPip);
        const hasBlank = hand.some((t) => t.low === 0 && t.high === 0);
        const ok = kind === "swap" ? hasSal && hasBlank : kind === "salamander" ? hasSal : hasBlank;
        if (ok) {
          lg.resetRoundWithSeed(preview.seed);
          const found =
            kind === "swap"
              ? `0:0 + ${maxPip}:${maxPip}`
              : kind === "salamander"
                ? `${maxPip}:${maxPip}`
                : "0:0";
          return endJob({
            message: `Found ${found} after ${i + 1} previews.`,
            result: { seed: preview.seed, hand: fmtHand(hand) },
          });
        }
      }

      if (i % 50 === 0) await sleep(0); // yield so ping / stop can be processed
    }

    endJob({ message: `Gave up after ${maxAttempts} previews.` });
  }

  const startJob = (starter, name, label) => {
    if (jobState.running) return { ok: false, error: "A job is already running — stop it first." };
    if (!window.localGame) return { ok: false, error: "Unlock first (window.localGame missing)." };
    const token = beginJob(name, label);
    // Fire-and-forget; the panel polls jobState via `ping`.
    Promise.resolve()
      .then(() => starter(token))
      .catch((error) => endJob({ error: error instanceof Error ? error.message : String(error) }));
    return { ok: true, value: { started: true } };
  };

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.data?.source !== "warp12-devtools-page") return;
    const { id, action, payload } = event.data;
    let response;

    if (action === "previewSound") {
      if (!allowedSounds.has(payload?.sound) || typeof window.warp12?.previewSound !== "function") {
        response = { ok: false, error: "Warp 12 sound bridge is not available." };
      } else {
        response = { ok: true, value: window.warp12.previewSound(payload.sound) };
      }
    } else if (action === "ping") {
      response = {
        ok: true,
        value: {
          hasLocalGame: Boolean(window.localGame),
          hasUnlock: typeof window.GABBAGABBAHEY === "function",
          hasWarp12: Boolean(window.warp12),
          href: window.location.href,
          maxPip: window.localGame?.getGame?.()?.maxPip ?? null,
          roundNumber: window.localGame?.getGame?.()?.round?.roundNumber ?? null,
          job: snapshotJob(),
        },
      };
    } else if (action === "unlock") {
      if (typeof window.GABBAGABBAHEY !== "function") {
        response = { ok: false, error: "Warp 12 admin unlock is not available. Are you on /local in DEV?" };
      } else {
        try {
          const unlocked = await window.GABBAGABBAHEY();
          response = unlocked
            ? { ok: true, value: true }
            : {
                ok: false,
                error: "Unlock refused — sign in with Google and a Firebase admin claim.",
              };
        } catch (error) {
          response = {
            ok: false,
            error: error instanceof Error ? error.message : "Unlock threw an error.",
          };
        }
      }
    } else if (action === "startAutoplay") {
      const hold = Boolean(payload?.holdSalamander);
      const mode = hold ? "random" : payload?.mode === "advisor" ? "advisor" : "random";
      response = startJob(
        (token) => runAutoplay(mode, hold, token),
        hold ? "autoplayHoldingSalamander" : "autoplayRound",
        hold ? "Autoplay · hold Salamander (random)" : `Autoplay round (${mode})`,
      );
    } else if (action === "findWormholeHand") {
      const maxPip = window.localGame?.getGame?.()?.maxPip ?? 12;
      const raw = payload?.x;
      let x = raw === undefined || raw === null || raw === "" ? null : Number(raw);
      if (x != null && (!Number.isInteger(x) || x < 0 || x >= maxPip)) {
        response = { ok: false, error: `X must be an integer between 0 and ${maxPip - 1}.` };
      } else {
        response = startJob(
          (token) => runWormholeSearch(x, token),
          "findWormholeHand",
          x != null ? `Find ${maxPip}:${x} + ${x}:${x} (you first)` : `Find ${maxPip}:X + X:X (you first)`,
        );
      }
    } else if (action === "findSwapSetup") {
      response = startJob((token) => runPreviewSearch("swap", token), "findSwapSetup", "Find Salamander swap setup");
    } else if (action === "findSalamanderOnly") {
      response = startJob((token) => runPreviewSearch("salamander", token), "findSalamanderOnly", "Find Salamander");
    } else if (action === "findDoubleBlank") {
      response = startJob((token) => runPreviewSearch("blank", token), "findDoubleBlank", "Find double blank (0:0)");
    } else if (action === "stopJob") {
      stopRequested = true;
      response = { ok: true, value: { stopped: true } };
    } else if (action === "localGame") {
      const method = payload?.method;
      const args = payload?.args ?? [];
      const game = window.localGame;
      if (!game || typeof game[method] !== "function") {
        response = { ok: false, error: `localGame.${method} is not available.` };
      } else {
        response = { ok: true, value: await game[method](...args) };
      }
    }

    window.postMessage({ source: "warp12-devtools-page-response", id, response }, "*");
  });
})();
