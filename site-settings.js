(() => {
  const extensionApi = globalThis.browser;
  const STORAGE_KEY = "siteSettings";

  function normalizeHostname(hostname) {
    return typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
  }

  function getHostFromUrl(url) {
    try {
      const parsed = new URL(url);

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "";
      }

      return normalizeHostname(parsed.hostname);
    } catch (error) {
      return "";
    }
  }

  function normalizeSettings(rawSettings = {}) {
    const disabledHosts = Array.isArray(rawSettings.disabledHosts)
      ? Array.from(new Set(rawSettings.disabledHosts.map(normalizeHostname).filter(Boolean))).sort()
      : [];

    return { disabledHosts };
  }

  async function getSettings() {
    if (!extensionApi?.storage?.local?.get) {
      return normalizeSettings();
    }

    const result = await extensionApi.storage.local.get(STORAGE_KEY);
    return normalizeSettings(result[STORAGE_KEY]);
  }

  async function saveSettings(nextSettings) {
    const normalized = normalizeSettings(nextSettings);

    if (extensionApi?.storage?.local?.set) {
      await extensionApi.storage.local.set({ [STORAGE_KEY]: normalized });
    }

    return normalized;
  }

  async function setHostEnabled(hostname, enabled) {
    const normalizedHost = normalizeHostname(hostname);
    const settings = await getSettings();

    if (!normalizedHost) {
      return settings;
    }

    const disabledHosts = settings.disabledHosts.filter((host) => host !== normalizedHost);

    if (!enabled) {
      disabledHosts.push(normalizedHost);
    }

    return saveSettings({ disabledHosts });
  }

  function isEnabledForHost(settings, hostname) {
    const normalizedHost = normalizeHostname(hostname);

    if (!normalizedHost) {
      return true;
    }

    return !normalizeSettings(settings).disabledHosts.includes(normalizedHost);
  }

  function getSiteHosts(targetWindow = window) {
    const hosts = new Set();
    const currentHost = normalizeHostname(targetWindow?.location?.hostname);

    if (currentHost) {
      hosts.add(currentHost);
    }

    try {
      const topHost = normalizeHostname(targetWindow.top?.location?.hostname);

      if (topHost) {
        hosts.add(topHost);
      }
    } catch (error) {
      // Cross-origin frames cannot inspect the top window hostname directly.
    }

    const referrerHost = getHostFromUrl(targetWindow?.document?.referrer ?? "");
    if (referrerHost) {
      hosts.add(referrerHost);
    }

    return Array.from(hosts);
  }

  function isEnabledForWindow(settings, targetWindow = window) {
    const normalized = normalizeSettings(settings);

    return !getSiteHosts(targetWindow).some((host) => normalized.disabledHosts.includes(host));
  }

  globalThis.RejectAllSiteSettings = Object.freeze({
    STORAGE_KEY,
    getHostFromUrl,
    getSettings,
    getSiteHosts,
    isEnabledForHost,
    isEnabledForWindow,
    normalizeHostname,
    normalizeSettings,
    saveSettings,
    setHostEnabled
  });
})();
