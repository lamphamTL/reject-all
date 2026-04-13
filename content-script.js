(() => {
  const KNOWN_REJECT_SELECTORS = [
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
  ];

  const KNOWN_ROOT_SELECTORS = [
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
  ];

  const KNOWN_BACKDROP_SELECTORS = [
    ".onetrust-pc-dark-filter",
    ".ot-fade-in",
    "[class*='didomi-overlay']",
    "[class*='qc-cmp2-overlay']",
    "[class*='trustarc'][class*='overlay']"
  ];

  const PRIVACY_KEYWORDS = [
    "cookie",
    "cookies",
    "consent",
    "privacy",
    "gdpr",
    "tracking",
    "partners",
    "vendors",
    "legitimate interest",
    "preference center",
    "manage preferences",
    "your choices",
    "we value your privacy"
  ];

  const REJECT_KEYWORDS = [
    "reject",
    "reject all",
    "decline",
    "deny",
    "refuse",
    "refuser",
    "tout refuser",
    "continue without accepting",
    "continuer sans accepter",
    "necessary only",
    "essential only",
    "only necessary"
  ];

  const ACCEPT_KEYWORDS = [
    "accept",
    "allow",
    "agree",
    "accept all",
    "allow all",
    "i agree"
  ];

  const INTERACTIVE_SELECTOR = [
    "button",
    "[role='button']",
    "a[href]",
    "input[type='button']",
    "input[type='submit']"
  ].join(",");

  const clickedElements = new WeakSet();
  const removedElements = new WeakSet();
  let scheduled = false;

  function scheduleSweep() {
    if (scheduled) {
      return;
    }

    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      sweep();
    }, 50);
  }

  function sweep() {
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
      for (const selector of KNOWN_REJECT_SELECTORS) {
        const element = root.querySelector(selector);
        if (isClickableRejectButton(element)) {
          return element;
        }
      }

      const candidates = root.querySelectorAll(INTERACTIVE_SELECTOR);
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

    for (const root of getSearchRoots()) {
      for (const selector of KNOWN_ROOT_SELECTORS) {
        root.querySelectorAll(selector).forEach((element) => {
          if (isRemovablePrivacyRoot(element)) {
            matches.add(element);
          }
        });
      }

      root.querySelectorAll(
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

    for (const root of getSearchRoots()) {
      for (const selector of KNOWN_BACKDROP_SELECTORS) {
        root.querySelectorAll(selector).forEach((element) => {
          if (isVisibleElement(element)) {
            matches.add(element);
          }
        });
      }

      root.querySelectorAll("[class*='overlay'], [class*='backdrop'], [id*='overlay'], [id*='backdrop']").forEach((element) => {
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

  function isInsidePrivacyContext(element) {
    let current = element;

    for (let depth = 0; current && depth < 6; depth += 1) {
      if (!(current instanceof HTMLElement)) {
        break;
      }

      if (matchesKnownSelector(current, KNOWN_ROOT_SELECTORS) || hasPrivacyVocabulary(current)) {
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
    return selectors.some((selector) => element.matches(selector));
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
    const openShadowRoots = document.querySelectorAll("*");

    for (const element of openShadowRoots) {
      if (element.shadowRoot) {
        roots.push(element.shadowRoot);
      }
    }

    return roots;
  }

  const observer = new MutationObserver(() => {
    scheduleSweep();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "open", "aria-hidden"]
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSweep, { once: true });
  }

  scheduleSweep();
})();
