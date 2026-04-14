(() => {
  const settingsApi = globalThis.RejectAllSiteSettings;
  const extensionApi = globalThis.browser;
  const {
    KNOWN_REJECT_SELECTORS = [],
    KNOWN_ROOT_SELECTORS = [],
    KNOWN_BACKDROP_SELECTORS = [],
    PRIVACY_KEYWORDS = [],
    REJECT_KEYWORDS = [],
    ACCEPT_KEYWORDS = [],
    SITE_RULES = {}
  } = globalThis.RejectAllConfig ?? {};

  const INTERACTIVE_SELECTOR = [
    "button",
    "[role='button']",
    "a[href]",
    "input[type='button']",
    "input[type='submit']"
  ].join(",");

  const clickedElements = new WeakSet();
  const removedElements = new WeakSet();
  const activeSiteRule = resolveSiteRule();
  const sitePreferredAction = getSitePreferredAction(activeSiteRule);
  const siteClickSelectors = getSiteClickSelectors(activeSiteRule, sitePreferredAction);
  const siteRootSelectors = getSiteSelectors(activeSiteRule, ["popupRoot", "rootSelectors"]);
  const siteBackdropSelectors = getSiteSelectors(activeSiteRule, ["backdrop", "backdropSelectors"]);
  let extensionEnabled = false;
  let observing = false;
  let scheduled = false;
  let siteSpecificStyleElement = null;

  function resolveSiteRule(targetWindow = window) {
    const siteHosts = settingsApi?.getSiteHosts ? settingsApi.getSiteHosts(targetWindow) : [targetWindow?.location?.hostname ?? ""];
    let matchedRule = null;
    let matchedHostLength = -1;

    for (const [hostKey, rule] of Object.entries(SITE_RULES)) {
      const normalizedHostKey = normalizeHostname(hostKey);

      if (!normalizedHostKey) {
        continue;
      }

      if (siteHosts.some((hostname) => matchesHostSuffix(hostname, normalizedHostKey)) && normalizedHostKey.length > matchedHostLength) {
        matchedRule = rule;
        matchedHostLength = normalizedHostKey.length;
      }
    }

    return matchedRule;
  }

  function normalizeHostname(hostname) {
    if (settingsApi?.normalizeHostname) {
      return settingsApi.normalizeHostname(hostname);
    }

    return typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
  }

  function matchesHostSuffix(hostname, suffix) {
    const normalizedHost = normalizeHostname(hostname);

    return normalizedHost === suffix || normalizedHost.endsWith(`.${suffix}`);
  }

  function getSiteSelectors(rule, fieldNames) {
    if (!rule) {
      return [];
    }

    const selectors = [];

    for (const fieldName of fieldNames) {
      const value = rule[fieldName];
      const values = Array.isArray(value) ? value : [value];

      for (const candidate of values) {
        if (typeof candidate !== "string") {
          continue;
        }

        const selector = candidate.trim();
        if (selector) {
          selectors.push(selector);
        }
      }
    }

    return Array.from(new Set(selectors));
  }

  function getSitePreferredAction(rule) {
    const preferredAction = rule?.preferredAction;

    if (preferredAction === "continueWithoutAccepting" || preferredAction === "removePopup") {
      return preferredAction;
    }

    return "rejectAllButton";
  }

  function getSiteClickSelectors(rule, preferredAction) {
    if (!rule || preferredAction === "removePopup") {
      return [];
    }

    if (preferredAction === "continueWithoutAccepting") {
      return getSiteSelectors(rule, ["continueWithoutAccepting", "rejectAllButton", "rejectButton", "clickSelectors"]);
    }

    return getSiteSelectors(rule, ["rejectAllButton", "rejectButton", "continueWithoutAccepting", "clickSelectors"]);
  }

  function scheduleSweep() {
    if (!extensionEnabled || scheduled) {
      return;
    }

    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      sweep();
    }, 50);
  }

  function sweep() {
    if (!extensionEnabled) {
      return;
    }

    let changed = false;

    for (let index = 0; index < 6; index += 1) {
      const button = findRejectButton();
      if (!button) {
        break;
      }

      if (clickElement(button)) {
        changed = true;
      }
    }

    for (const root of collectPrivacyRoots()) {
      if (removeElement(root)) {
        changed = true;
      }
    }

    for (const backdrop of collectBackdrops()) {
      if (removeElement(backdrop)) {
        changed = true;
      }
    }

    if (changed) {
      unlockPage();
    }
  }

  function findRejectButton() {
    const roots = getSearchRoots();

    for (const root of roots) {
      for (const selector of siteClickSelectors) {
        const element = querySelectorSafe(root, selector);
        if (isConfiguredClickableTarget(element)) {
          return element;
        }
      }

      if (sitePreferredAction === "removePopup") {
        continue;
      }

      for (const selector of KNOWN_REJECT_SELECTORS) {
        const element = querySelectorSafe(root, selector);
        if (isClickableRejectButton(element)) {
          return element;
        }
      }

      const candidates = querySelectorAllSafe(root, INTERACTIVE_SELECTOR);
      for (const candidate of candidates) {
        if (isClickableRejectButton(candidate)) {
          return candidate;
        }
      }
    }

    return null;
  }

  function collectPrivacyRoots() {
    const matches = new Set();
    const roots = getSearchRoots();

    for (const root of roots) {
      for (const selector of siteRootSelectors) {
        querySelectorAllSafe(root, selector).forEach((element) => {
          if (isConfiguredRemovableElement(element)) {
            matches.add(element);
          }
        });
      }
    }

    for (const root of roots) {
      for (const selector of KNOWN_ROOT_SELECTORS) {
        querySelectorAllSafe(root, selector).forEach((element) => {
          if (isRemovablePrivacyRoot(element)) {
            matches.add(element);
          }
        });
      }

      querySelectorAllSafe(
        root,
        "[role='dialog'], dialog, [aria-modal='true'], [id*='cookie'], [class*='cookie'], [id*='consent'], [class*='consent'], [id*='privacy'], [class*='privacy'], [id*='gdpr'], [class*='gdpr']"
      ).forEach((element) => {
        if (isRemovablePrivacyRoot(element)) {
          matches.add(element);
        }
      });
    }

    return Array.from(matches);
  }

  function collectBackdrops() {
    const matches = new Set();
    const roots = getSearchRoots();

    for (const root of roots) {
      for (const selector of siteBackdropSelectors) {
        querySelectorAllSafe(root, selector).forEach((element) => {
          if (isConfiguredRemovableElement(element)) {
            matches.add(element);
          }
        });
      }
    }

    for (const root of roots) {
      for (const selector of KNOWN_BACKDROP_SELECTORS) {
        querySelectorAllSafe(root, selector).forEach((element) => {
          if (isVisibleElement(element)) {
            matches.add(element);
          }
        });
      }

      querySelectorAllSafe(root, "[class*='overlay'], [class*='backdrop'], [id*='overlay'], [id*='backdrop']").forEach((element) => {
        if (isPrivacyBackdrop(element)) {
          matches.add(element);
        }
      });
    }

    return Array.from(matches);
  }

  function isClickableRejectButton(element) {
    if (!(element instanceof HTMLElement) || clickedElements.has(element) || !isVisibleElement(element)) {
      return false;
    }

    const label = getElementLabel(element);
    if (!containsKeyword(label, REJECT_KEYWORDS) || containsKeyword(label, ACCEPT_KEYWORDS)) {
      return false;
    }

    return isInsidePrivacyContext(element);
  }

  function isConfiguredClickableTarget(element) {
    return element instanceof HTMLElement && !clickedElements.has(element) && isVisibleElement(element);
  }

  function isInsidePrivacyContext(element) {
    let current = element;

    for (let depth = 0; current && depth < 6; depth += 1) {
      if (!(current instanceof HTMLElement)) {
        break;
      }

      if (matchesKnownSelector(current, siteRootSelectors) || matchesKnownSelector(current, KNOWN_ROOT_SELECTORS) || hasPrivacyVocabulary(current)) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  function isRemovablePrivacyRoot(element) {
    if (!(element instanceof HTMLElement) || removedElements.has(element) || !isVisibleElement(element)) {
      return false;
    }

    if (!hasPrivacyVocabulary(element)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const interactiveCount = element.querySelectorAll(INTERACTIVE_SELECTOR).length;
    const fixedPosition = style.position === "fixed" || style.position === "sticky";
    const dialogLike =
      element.matches("dialog, [role='dialog'], [aria-modal='true']") ||
      fixedPosition ||
      Number.parseInt(style.zIndex || "0", 10) >= 50;
    const wideEnough = rect.width >= Math.min(window.innerWidth * 0.35, 320);
    const tallEnough = rect.height >= 48;

    return dialogLike && wideEnough && tallEnough && interactiveCount > 0;
  }

  function isConfiguredRemovableElement(element) {
    return element instanceof HTMLElement && !removedElements.has(element) && element.isConnected;
  }

  function isPrivacyBackdrop(element) {
    if (!(element instanceof HTMLElement) || removedElements.has(element) || !isVisibleElement(element)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const coversViewport = rect.width >= window.innerWidth * 0.8 && rect.height >= window.innerHeight * 0.5;
    const fixedPosition = style.position === "fixed";
    const transparent = style.backgroundColor === "rgba(0, 0, 0, 0)" && style.backdropFilter === "none";

    if (!coversViewport || !fixedPosition || transparent) {
      return false;
    }

    return hasPrivacyVocabulary(element.parentElement) || matchesKnownSelector(element, KNOWN_BACKDROP_SELECTORS);
  }

  function hasPrivacyVocabulary(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const label = getElementLabel(element);
    return containsKeyword(label, PRIVACY_KEYWORDS);
  }

  function getElementLabel(element) {
    const pieces = [
      element.id,
      element.className,
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.textContent
    ]
      .filter(Boolean)
      .join(" ");

    return pieces.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function containsKeyword(label, keywords) {
    return keywords.some((keyword) => label.includes(keyword));
  }

  function matchesKnownSelector(element, selectors) {
    return selectors.some((selector) => matchesSafe(element, selector));
  }

  function removeElement(element) {
    if (!(element instanceof HTMLElement) || removedElements.has(element)) {
      return false;
    }

    removedElements.add(element);

    if (element.parentNode) {
      element.remove();
      return true;
    }

    return false;
  }

  function clickElement(element) {
    if (!(element instanceof HTMLElement) || clickedElements.has(element)) {
      return false;
    }

    clickedElements.add(element);
    element.click();
    return true;
  }

  function unlockPage() {
    document.documentElement.classList.add("reject-all-unlocked");
    document.body?.classList.add("reject-all-unlocked");

    for (const element of [document.documentElement, document.body]) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }

      const style = window.getComputedStyle(element);
      if (style.overflow === "hidden" || style.overflowY === "hidden" || style.overflow === "clip" || style.overflowY === "clip") {
        element.style.setProperty("overflow", "auto", "important");
        element.style.setProperty("overflow-y", "auto", "important");
      }

      if (style.pointerEvents === "none") {
        element.style.setProperty("pointer-events", "auto", "important");
      }
    }
  }

  function isVisibleElement(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0;
  }

  function getSearchRoots() {
    const roots = [document];
    const openShadowRoots = querySelectorAllSafe(document, "*");

    for (const element of openShadowRoots) {
      if (element.shadowRoot) {
        roots.push(element.shadowRoot);
      }
    }

    return roots;
  }

  function querySelectorSafe(root, selector) {
    try {
      return root.querySelector(selector);
    } catch (error) {
      return null;
    }
  }

  function querySelectorAllSafe(root, selector) {
    try {
      return Array.from(root.querySelectorAll(selector));
    } catch (error) {
      return [];
    }
  }

  function matchesSafe(element, selector) {
    try {
      return element.matches(selector);
    } catch (error) {
      return false;
    }
  }

  const observer = new MutationObserver(() => {
    syncDocumentClasses();
    scheduleSweep();
  });

  function syncDocumentClasses() {
    for (const element of [document.documentElement, document.body]) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }

      element.classList.toggle("reject-all-active", extensionEnabled);

      if (!extensionEnabled) {
        element.classList.remove("reject-all-unlocked");
      }
    }

    syncSiteSpecificStyles();
  }

  function syncSiteSpecificStyles() {
    const styleText = extensionEnabled ? getSiteSpecificStyleText() : "";

    if (!styleText) {
      siteSpecificStyleElement?.remove();
      siteSpecificStyleElement = null;
      return;
    }

    const parent = document.head || document.documentElement;
    if (!(parent instanceof HTMLElement)) {
      return;
    }

    if (!siteSpecificStyleElement || !siteSpecificStyleElement.isConnected) {
      siteSpecificStyleElement = document.createElement("style");
      siteSpecificStyleElement.id = "reject-all-site-rules";
      parent.prepend(siteSpecificStyleElement);
    }

    if (siteSpecificStyleElement.textContent !== styleText) {
      siteSpecificStyleElement.textContent = styleText;
    }
  }

  function getSiteSpecificStyleText() {
    if (sitePreferredAction !== "removePopup") {
      return "";
    }

    const selectors = Array.from(new Set([...siteRootSelectors, ...siteBackdropSelectors]));

    if (selectors.length === 0) {
      return "";
    }

    const scopedSelectors = selectors.map((selector) => `html.reject-all-active ${selector}`);

    return `${scopedSelectors.join(",\n")} {\n  opacity: 0 !important;\n  visibility: hidden !important;\n  pointer-events: none !important;\n}`;
  }

  function startObserver() {
    if (observing || !(document.documentElement instanceof HTMLElement)) {
      return;
    }

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "open", "aria-hidden"]
    });
    observing = true;
  }

  function stopObserver() {
    if (!observing) {
      return;
    }

    observer.disconnect();
    observing = false;
  }

  function applyEnabledState(nextEnabled) {
    extensionEnabled = Boolean(nextEnabled);
    syncDocumentClasses();

    if (extensionEnabled) {
      startObserver();
      scheduleSweep();
      return;
    }

    stopObserver();
  }

  async function initializeEnabledState() {
    if (!settingsApi) {
      applyEnabledState(true);
      return;
    }

    const settings = await settingsApi.getSettings();
    applyEnabledState(settingsApi.isEnabledForWindow(settings, window));
  }

  if (settingsApi && extensionApi?.storage?.onChanged) {
    extensionApi.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !(settingsApi.STORAGE_KEY in changes)) {
        return;
      }

      const nextSettings = settingsApi.normalizeSettings(changes[settingsApi.STORAGE_KEY].newValue);
      applyEnabledState(settingsApi.isEnabledForWindow(nextSettings, window));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        syncDocumentClasses();
        scheduleSweep();
      },
      { once: true }
    );
  }

  initializeEnabledState().catch(() => {
    applyEnabledState(true);
  });
})();
