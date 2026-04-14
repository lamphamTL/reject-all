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

## Custom Site Rules

Site-specific selectors live in [`site-rules.js`](/Users/lamp/Documents/Project/reject-all/site-rules.js). Rules are keyed by hostname suffix, so an entry for `lefigaro.fr` also applies to `www.lefigaro.fr`.

Each rule can declare:

- `preferredAction`: one of `rejectAllButton`, `continueWithoutAccepting`, or `removePopup`. Defaults to `rejectAllButton`.
- `popupRoot`: selector for the main consent banner root to remove or hide.
- `rejectAllButton`: selector for an explicit reject-all button to click first.
- `continueWithoutAccepting`: selector for an explicit continue-without-accepting button to click first.
- `backdrop`: selector for an explicit overlay or backdrop to remove or hide.
- `rootSelectors`, `clickSelectors`, `backdropSelectors`: optional extra selector arrays for less common cases.

Example:

```js
globalThis.RejectAllConfig.SITE_RULES = Object.freeze({
  "example.com": Object.freeze({
    preferredAction: "rejectAllButton",
    popupRoot: "#privacy-banner",
    rejectAllButton: "#reject-all",
    continueWithoutAccepting: "#continue-without-accepting",
    backdrop: ".privacy-overlay",
    rootSelectors: [".cookie-modal"],
    clickSelectors: [".secondary-action"],
    backdropSelectors: [".modal-backdrop"]
  })
});
```

## Files

- [`manifest.json`](/Users/lamp/Documents/Project/reject-all/manifest.json): Firefox-compatible extension manifest.
- [`site-settings.js`](/Users/lamp/Documents/Project/reject-all/site-settings.js): shared storage and hostname matching helpers for site-specific enablement.
- [`site-rules.js`](/Users/lamp/Documents/Project/reject-all/site-rules.js): hostname-suffix registry for site-specific consent selectors.
- [`rules/`](</Users/lamp/Documents/Project/reject-all/rules>): standalone selector and keyword lists loaded before the main content script.
- [`content-script.js`](/Users/lamp/Documents/Project/reject-all/content-script.js): DOM observer and popup rejection/removal logic that reads from the rule files.
- [`content-styles.css`](/Users/lamp/Documents/Project/reject-all/content-styles.css): early CSS suppression for known consent containers.
- [`popup.html`](/Users/lamp/Documents/Project/reject-all/popup.html): toolbar UI for enabling and disabling the extension per site.
