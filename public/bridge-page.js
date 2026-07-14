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
    } else if (action === "unlock") {
      if (typeof window.GABBAGABBAHEY !== "function") {
        response = { ok: false, error: "Warp 12 admin unlock is not available." };
      } else {
        response = { ok: true, value: await window.GABBAGABBAHEY() };
      }
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
