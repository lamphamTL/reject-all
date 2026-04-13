# reject-all

Firefox-first WebExtension that rejects or removes privacy and cookie popups when they appear.

## What it does

- Runs on every page with a content script.
- Tries to click a visible reject or decline button for common CMPs such as OneTrust, Cookiebot, Didomi, Quantcast, and TrustArc.
- Removes leftover consent overlays and restores page scrolling if the popup locked the document.

## Load it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on...`.
3. Pick [`manifest.json`](/Users/lamp/.codex/worktrees/07eb/reject-all/manifest.json).

## Files

- [`manifest.json`](/Users/lamp/.codex/worktrees/07eb/reject-all/manifest.json): Firefox-compatible extension manifest.
- [`content-script.js`](/Users/lamp/.codex/worktrees/07eb/reject-all/content-script.js): DOM observer and popup rejection/removal logic.
- [`content-styles.css`](/Users/lamp/.codex/worktrees/07eb/reject-all/content-styles.css): early CSS suppression for known consent containers.
