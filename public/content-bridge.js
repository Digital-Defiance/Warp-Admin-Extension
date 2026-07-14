(() => {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("bridge-page.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "warp12-devtools-page-response") return;
    window.__warp12DevtoolsResponses?.get(event.data.id)?.(event.data.response);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const id = crypto.randomUUID();
    const timeout = window.setTimeout(() => sendResponse({ ok: false, error: "Warp 12 bridge timed out." }), 5000);
    window.__warp12DevtoolsResponses ??= new Map();
    window.__warp12DevtoolsResponses.set(id, (response) => {
      window.clearTimeout(timeout);
      window.__warp12DevtoolsResponses?.delete(id);
      sendResponse(response);
    });
    window.postMessage({ source: "warp12-devtools-page", id, action: message.action, payload: message.payload }, "*");
    return true;
  });
})();
