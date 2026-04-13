(() => {
  const extensionApi = globalThis.browser;
  const settingsApi = globalThis.RejectAllSiteSettings;

  const currentSiteElement = document.getElementById("current-site");
  const siteEnabledToggle = document.getElementById("site-enabled");
  const unsupportedMessageElement = document.getElementById("unsupported-message");
  const disabledSitesElement = document.getElementById("disabled-sites");
  const emptyStateElement = document.getElementById("empty-state");

  let activeTabId = null;
  let currentHost = "";

  function setUnsupportedState(message) {
    currentSiteElement.textContent = "Unsupported page";
    siteEnabledToggle.checked = false;
    siteEnabledToggle.disabled = true;
    unsupportedMessageElement.textContent = message;
    unsupportedMessageElement.hidden = false;
  }

  function renderDisabledSites(settings) {
    disabledSitesElement.textContent = "";

    if (settings.disabledHosts.length === 0) {
      disabledSitesElement.hidden = true;
      emptyStateElement.hidden = false;
      return;
    }

    disabledSitesElement.hidden = false;
    emptyStateElement.hidden = true;

    for (const host of settings.disabledHosts) {
      const item = document.createElement("li");
      item.className = "site-list-item";

      const hostLabel = document.createElement("span");
      hostLabel.className = "site-host";
      hostLabel.textContent = host;

      const enableButton = document.createElement("button");
      enableButton.className = "site-action";
      enableButton.type = "button";
      enableButton.textContent = "Enable";
      enableButton.addEventListener("click", () => {
        void enableHost(host);
      });

      item.append(hostLabel, enableButton);
      disabledSitesElement.append(item);
    }
  }

  function renderCurrentSite(settings) {
    if (!currentHost) {
      setUnsupportedState("Open the popup on an http or https page to change site settings.");
      return;
    }

    currentSiteElement.textContent = currentHost;
    siteEnabledToggle.checked = settingsApi.isEnabledForHost(settings, currentHost);
    siteEnabledToggle.disabled = false;
    unsupportedMessageElement.hidden = true;
    unsupportedMessageElement.textContent = "";
  }

  async function refreshPopup() {
    const settings = await settingsApi.getSettings();
    renderCurrentSite(settings);
    renderDisabledSites(settings);
  }

  async function reloadCurrentTabAndClose() {
    if (typeof activeTabId === "number") {
      await extensionApi.tabs.reload(activeTabId);
    }

    window.close();
  }

  async function enableHost(host) {
    await settingsApi.setHostEnabled(host, true);

    if (host === currentHost) {
      await reloadCurrentTabAndClose();
      return;
    }

    await refreshPopup();
  }

  siteEnabledToggle.addEventListener("change", () => {
    if (!currentHost) {
      return;
    }

    siteEnabledToggle.disabled = true;

    void settingsApi
      .setHostEnabled(currentHost, siteEnabledToggle.checked)
      .then(() => reloadCurrentTabAndClose())
      .catch(() => {
        siteEnabledToggle.disabled = false;
        unsupportedMessageElement.textContent = "Could not update the setting for this site.";
        unsupportedMessageElement.hidden = false;
      });
  });

  async function initializePopup() {
    if (!extensionApi?.tabs?.query || !settingsApi) {
      setUnsupportedState("Browser APIs are unavailable in this popup.");
      return;
    }

    const [activeTab] = await extensionApi.tabs.query({ active: true, currentWindow: true });
    activeTabId = activeTab?.id ?? null;
    currentHost = settingsApi.getHostFromUrl(activeTab?.url ?? "");

    await refreshPopup();
  }

  void initializePopup().catch(() => {
    setUnsupportedState("Could not load the current site settings.");
  });
})();
