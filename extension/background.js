importScripts("config.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ selectedRelay: null }, () => {
    console.log("SalusVPN extension installed and storage initialized.");
  });
});

function isInjectableUrl(url) {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

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
    const port = new URL(stored.dashboardBaseUrl).port || "3000";
    const cached = await probeDashboardPort(port);
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

async function findInjectableTab() {
  const [active] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });

  if (active?.id && isInjectableUrl(active.url)) {
    return { tabId: active.id, created: false };
  }

  const candidates = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  const preferred = candidates.find(
    (tab) =>
      tab.id &&
      isInjectableUrl(tab.url) &&
      !tab.url.includes("chrome.google.com/webstore")
  );

  if (preferred?.id) {
    await chrome.tabs.update(preferred.id, { active: true });
    return { tabId: preferred.id, created: false };
  }

  const tab = await chrome.tabs.create({
    url: "https://solana.com",
    active: false,
  });

  if (!tab?.id) throw new Error("Could not open a page for wallet connection.");

  await waitForTabReady(tab.id);
  return { tabId: tab.id, created: true };
}

async function saveWalletState(result) {
  await chrome.storage.local.set({
    walletConnected: true,
    walletPublicKey: result.publicKey,
    walletName: result.walletName,
    walletSyncedAt: new Date().toISOString(),
  });
}

async function connectWalletViaProvider(walletName) {
  const { tabId } = await findInjectableTab();

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["inpage-wallet.js"],
    world: "MAIN",
  });

  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async (name) => {
      if (typeof window.__salusConnectWallet !== "function") {
        throw new Error("Wallet connector failed to load.");
      }
      return window.__salusConnectWallet(name);
    },
    args: [walletName],
  });

  const result = injection?.result;
  if (!result?.publicKey) {
    throw new Error("Wallet connection was cancelled or failed.");
  }

  await saveWalletState(result);
  return { ok: true, ...result };
}

async function disconnectWalletViaProvider() {
  const stored = await chrome.storage.local.get(["walletName"]);
  const walletName = stored.walletName;
  if (!walletName) {
    await chrome.storage.local.set({
      walletConnected: false,
      walletPublicKey: null,
      walletName: null,
    });
    return { ok: true };
  }

  try {
    const { tabId } = await findInjectableTab();
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["inpage-wallet.js"],
      world: "MAIN",
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: async (name) => {
        if (typeof window.__salusDisconnectWallet === "function") {
          return window.__salusDisconnectWallet(name);
        }
        return { ok: true };
      },
      args: [walletName],
    });
  } catch {
    // Still clear local state if provider disconnect fails.
  }

  await chrome.storage.local.set({
    walletConnected: false,
    walletPublicKey: null,
    walletName: null,
  });

  return { ok: true };
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
    connectWalletViaProvider(message.walletName)
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
    disconnectWalletViaProvider()
      .then((result) => sendResponse(result))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "CLOSE_CONNECT_TAB" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
    sendResponse({ ok: true });
    return true;
  }
});
