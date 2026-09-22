# Paper Reading Helper

AI-assisted Chrome extension for reading academic PDFs.

## MVP now
- Manifest V3 extension
- floating PRH launcher
- Paper Helper side panel
- placeholder Key Ideas and Chapter Essentials UI

## Run locally
1. Clone this repository.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the repository folder.
6. Open a normal webpage and click the PRH button.

## Next milestone
Chrome's built-in PDF viewer isolates its text layer from ordinary content scripts. We will therefore add an extension-owned PDF.js viewer, extract text spans + coordinates, then connect those spans to the analysis API for:
- important-sentence underlines
- semantic relationship brackets
- click-to-summarize concept groups
- chapter essentials
- paper-level interactive keywords
