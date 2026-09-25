# Paper Reading Helper

Chrome Manifest V3 extension for AI-assisted academic PDF reading.

## Current prototype

- extension-owned PDF reader
- PDF.js canvas + selectable text overlay
- sentence reconstruction
- important-passage underlines
- related-concept brackets and click summaries
- chapter detection + Chapter Essentials
- interactive paper keywords
- local heuristic analyzer, ready to be replaced by the PRH API

## Build and load

The extension must be built before loading it into Chrome because Manifest V3 does not allow remotely hosted executable code.

```bash
npm install
npm run build
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the generated `dist/` directory.

When a browser tab is directly displaying a URL ending in `.pdf`, click the Paper Reading Helper extension icon to open that PDF in the PRH viewer.

## Why PDF.js is bundled

Manifest V3 requires executable extension code to be packaged with the extension. PDF.js is therefore installed from npm and bundled by Vite instead of being imported from a CDN.

## Verification checklist

1. `npm run build` completes without errors.
2. Load `dist/` as an unpacked extension.
3. Open a public PDF URL and click the extension icon.
4. Confirm pages render in the PRH viewer.
5. Click **Analyze**.
6. Confirm important passages are underlined.
7. Confirm concept brackets appear when related passages exist.
8. Confirm Chapter Essentials and Paper Keywords are interactive.

## Next architecture step

Replace the local analyzer behind a stable analysis-client interface. The extension should send normalized sentence/chapter data to the PRH backend and receive structured JSON for importance, concept groups, chapter essentials, and keywords. Secret model-provider API keys must stay on the backend, not inside the extension.
