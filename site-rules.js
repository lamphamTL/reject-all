globalThis.RejectAllConfig = globalThis.RejectAllConfig || {};

globalThis.RejectAllConfig.SITE_RULES = Object.freeze({
  "lefigaro.fr": Object.freeze({
    preferredAction: "removePopup",
    popupRoot: "#appconsent"
  })
});
