globalThis.RejectAllConfig = globalThis.RejectAllConfig || {};

globalThis.RejectAllConfig.KNOWN_ROOT_SELECTORS = Object.freeze([
  "#onetrust-consent-sdk",
  ".onetrust-pc-sdk",
  ".ot-sdk-container",
  "#CybotCookiebotDialog",
  "#CookiebotWidget",
  "#didomi-host",
  "#didomi-popup",
  ".didomi-popup-container",
  "#qc-cmp2-container",
  ".qc-cmp2-container",
  "#truste-consent-track",
  ".truste_overlay",
  "[id^='sp_message_container']",
  "[id*='cookiebanner']",
  "[id*='cookie-banner']",
  "[class*='cookie-banner']",
  "[id*='consent-banner']",
  "[class*='consent-banner']"
]);
