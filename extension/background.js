importScripts("config.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ selectedRelay: null }, () => {
    console.log("SalusVPN extension installed and storage initialized.");
  });
});

function isLocalDashboardUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      (parsed.pathname === "/" ||
        parsed.pathname.startsWith("/connect") ||
        parsed.pathname.startsWith("/#"))
    );
  } catch {
    return false;
  }
}

async function probeDashboardPort(port) {
  const base = `http://localhost:${port}`;
  try {
    const response = await fetch(`${base}/api/session/history`);
    return response.ok ? base : null;
  } catch {
    return null;
  }
}

async function resolveDashboardBase() {
  const stored = await chrome.storage.local.get(["dashboardBaseUrl"]);
  if (stored.dashboardBaseUrl) {
    const cached = await probeDashboardPort(new URL(stored.dashboardBaseUrl).port);
    if (cached) return cached;
  }

  for (const port of DASHBOARD_PORTS) {
    const base = await probeDashboardPort(port);
    if (base) {
      await chrome.storage.local.set({ dashboardBaseUrl: base });
      return base;
    }
  }

  return DASHBOARD_URL;
}

function waitForTabReady(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId, (tab) => {
      if (tab?.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

async function openConnectTab(walletName) {
  const base = await resolveDashboardBase();
  const connectUrl = `${base}/connect?wallet=${encodeURIComponent(walletName)}`;

  const tabs = await chrome.tabs.query({});
  const existingConnect = tabs.find(
    (tab) =>
      tab.url &&
      tab.url.includes("/connect") &&
      isLocalDashboardUrl(tab.url)
  );

  if (existingConnect?.id) {
    await chrome.tabs.update(existingConnect.id, {
      active: true,
      url: connectUrl,
    });
    await waitForTabReady(existingConnect.id);
    return existingConnect.id;
  }

  const tab = await chrome.tabs.create({ url: connectUrl, active: true });
  if (!tab?.id) throw new Error("Could not open connect tab");
  await waitForTabReady(tab.id);
  return tab.id;
}

async function relayConnectWallet(walletName) {
  await chrome.storage.local.set({ pendingWalletConnect: walletName });
  const tabId = await openConnectTab(walletName);

  await new Promise((r) => setTimeout(r, 500));

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "CONNECT_WALLET", walletName },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: true, deferred: true });
          return;
        }
        resolve(response ?? { ok: true });
      }
    );
  });
}

async function ensureDashboardTab() {
  const base = await resolveDashboardBase();
  const dashboardUrl = `${base}/#session`;
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => isLocalDashboardUrl(tab.url));

  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true, url: dashboardUrl });
    await waitForTabReady(existing.id);
    return existing.id;
  }

  const tab = await chrome.tabs.create({ url: dashboardUrl, active: true });
  if (!tab?.id) return null;
  await waitForTabReady(tab.id);
  return tab.id;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getSelectedRelay") {
    chrome.storage.local.get(["selectedRelay"], (result) => {
      sendResponse({ selectedRelay: result.selectedRelay ?? null });
    });
    return true;
  }

  if (message.type === "CONNECT_WALLET") {
    relayConnectWallet(message.walletName)
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Connect failed",
        })
      );
    return true;
  }

  if (message.type === "DISCONNECT_WALLET") {
    ensureDashboardTab()
      .then((tabId) => {
        if (!tabId) {
          sendResponse({ ok: false });
          return;
        }
        chrome.tabs.sendMessage(
          tabId,
          { type: "DISCONNECT_WALLET" },
          (response) => sendResponse(response ?? { ok: true })
        );
      })
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "CLOSE_CONNECT_TAB" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
    sendResponse({ ok: true });
    return true;
  }
});
