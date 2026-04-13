# reject-all

Firefox-first WebExtension that rejects or removes privacy and cookie popups when they appear.

## What it does

- Runs on every page with a content script.
- Tries to click a visible reject or decline button for common CMPs such as OneTrust, Cookiebot, Didomi, Quantcast, and TrustArc.
- Removes leftover consent overlays and restores page scrolling if the popup locked the document.
- Lets you disable the extension on specific sites from the toolbar popup.

## Load it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on...`.
3. Pick [`manifest.json`](/Users/lamp/Documents/Project/reject-all/manifest.json).

## Site Controls

1. Pin the extension in Firefox’s toolbar if needed.
2. Open the extension popup from the toolbar button.
3. Toggle `Enabled on this site` for the current hostname.

The popup also shows the list of hostnames where the extension is currently disabled.

## Files

- [`manifest.json`](/Users/lamp/Documents/Project/reject-all/manifest.json): Firefox-compatible extension manifest.
- [`site-settings.js`](/Users/lamp/Documents/Project/reject-all/site-settings.js): shared storage and hostname matching helpers for site-specific enablement.
- [`rules/`](</Users/lamp/Documents/Project/reject-all/rules>): standalone selector and keyword lists loaded before the main content script.
- [`content-script.js`](/Users/lamp/Documents/Project/reject-all/content-script.js): DOM observer and popup rejection/removal logic that reads from the rule files.
- [`content-styles.css`](/Users/lamp/Documents/Project/reject-all/content-styles.css): early CSS suppression for known consent containers.
- [`popup.html`](/Users/lamp/Documents/Project/reject-all/popup.html): toolbar UI for enabling and disabling the extension per site.
