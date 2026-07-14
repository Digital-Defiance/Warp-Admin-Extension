# Warp 12 DevTools

Chrome side-panel extension that hooks into a local Warp 12 game at `http://localhost:4200/local` and runs admin commands in that page's JS context.

## Install

```bash
pnpm build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/spa` folder

## Use

1. Start your Warp local sim at [http://localhost:4200/local](http://localhost:4200/local)
2. Click the **Warp 12 DevTools** extension icon — it opens a **side panel** docked beside the browser window
3. Confirm the header shows a link to `localhost:4200/local` and **Page bridge live**
4. Click **Unlock console** — this runs `await window.GABBAGABBAHEY()` in the game tab, then use commands / sounds from the panel

If the bridge shows "Reload game tab…", refresh the game tab after installing or updating the extension so the content script can inject.

## How it works

- A content script injects `bridge-page.js` into localhost pages
- The side panel finds the `/local` game tab and sends messages to it
- Those messages call `window.GABBAGABBAHEY()`, `window.localGame.*`, and `window.warp12.previewSound(...)` in the page
