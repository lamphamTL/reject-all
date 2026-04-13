globalThis.RejectAllConfig = globalThis.RejectAllConfig || {};

globalThis.RejectAllConfig.KNOWN_BACKDROP_SELECTORS = Object.freeze([
  ".onetrust-pc-dark-filter",
  ".ot-fade-in",
  "[class*='didomi-overlay']",
  "[class*='qc-cmp2-overlay']",
  "[class*='trustarc'][class*='overlay']"
]);
