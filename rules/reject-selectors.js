globalThis.RejectAllConfig = globalThis.RejectAllConfig || {};

globalThis.RejectAllConfig.KNOWN_REJECT_SELECTORS = Object.freeze([
  "#onetrust-reject-all-handler",
  "#CybotCookiebotDialogBodyButtonDecline",
  "#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll",
  "#CybotCookiebotDialogBodyLevelButtonDecline",
  "[id*='didomi-notice-disagree-button']",
  ".didomi-notice-disagree-button",
  ".qc-cmp2-summary-buttons button[mode='secondary']",
  ".qc-cmp2-footer button[mode='secondary']",
  "[id*='trustarc'] button[id*='reject']",
  "[class*='trustarc'] button[class*='reject']"
]);
