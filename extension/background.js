importScripts("config.js");

const BRIDGE_PAGE_URL = "https://solana.com";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ selectedRelay: null }, () => {
    console.log("SalusVPN extension installed and storage initialized.");
  });
});

function isInjectableUrl(url) {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
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

function waitForTabReady(tabId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Timed out waiting for page to load."));
    }, timeoutMs);

    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) return;
      if (tab?.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

async function createBridgeTab() {
  const tab = await chrome.tabs.create({
    url: BRIDGE_PAGE_URL,
    active: false,
  });

  if (!tab?.id) {
    throw new Error("Could not open a page to connect your wallet.");
  }

  await waitForTabReady(tab.id);
  await new Promise((r) => setTimeout(r, 300));
  return tab.id;
}

async function resolveConnectTabId(tabId, tabUrl) {
  if (tabId && isInjectableUrl(tabUrl)) {
    return tabId;
  }

  const candidates = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  const preferred = candidates.find(
    (tab) =>
      tab.id &&
      isInjectableUrl(tab.url) &&
      !tab.url.includes("chrome.google.com/webstore")
  );

  if (preferred?.id) {
    return preferred.id;
  }

  return createBridgeTab();
}

function showConnectNotification(walletName) {
  chrome.notifications.create(`salus-connect-${Date.now()}`, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "SalusVPN — Approve wallet",
    message: `Confirm the connection in the ${walletName} window (check your toolbar).`,
    priority: 2,
  });
}

async function injectWalletConnect(tabId, walletName) {
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
        throw new Error("Wallet connector failed to load on this page.");
      }
      return window.__salusConnectWallet(name);
    },
    args: [walletName],
  });

  if (injection?.error) {
    throw new Error(injection.error.message || "Wallet injection failed.");
  }

  const result = injection?.result;
  if (!result?.publicKey) {
    throw new Error("Wallet connection was cancelled or failed.");
  }

  return result;
}

async function connectViaDashboard(walletName) {
  const base = await resolveDashboardBase();
  const connectUrl = `${base}/connect?wallet=${encodeURIComponent(walletName)}`;
  const tab = await chrome.tabs.create({ url: connectUrl, active: true });
  if (!tab?.id) throw new Error("Could not open dashboard connect page.");

  await waitForTabReady(tab.id);
  await new Promise((r) => setTimeout(r, 1000));

  chrome.tabs.sendMessage(tab.id, { type: "CONNECT_WALLET", walletName });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((r) => setTimeout(r, 500));
    const stored = await chrome.storage.local.get([
      "walletConnected",
      "walletPublicKey",
      "walletName",
    ]);
    if (stored.walletConnected && stored.walletPublicKey) {
      return {
        publicKey: stored.walletPublicKey,
        walletName: stored.walletName ?? walletName,
      };
    }
  }

  throw new Error(
    "Dashboard connect timed out. Run npm run dev and approve in MetaMask."
  );
}

async function saveWalletState(result, tabId) {
  await chrome.storage.local.set({
    walletConnected: true,
    walletPublicKey: result.publicKey,
    walletName: result.walletName,
    walletSyncedAt: new Date().toISOString(),
    walletConnectTabId: tabId ?? null,
    walletConnecting: null,
    walletConnectError: null,
    walletSessionSigned: false,
  });
}

async function injectOnTab(tabId, func, args = []) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["inpage-wallet.js"],
    world: "MAIN",
  });

  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func,
    args,
  });

  return injection?.result;
}

async function disconnectOnAllTabs(walletName) {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id) return;
      try {
        if (walletName) {
          await injectOnTab(
            tab.id,
            async (name) => {
              if (typeof window.__salusDisconnectWallet === "function") {
                return window.__salusDisconnectWallet(name);
              }
              return { ok: true };
            },
            [walletName]
          );
        } else {
          await injectOnTab(tab.id, async () => {
            if (typeof window.__salusDisconnectAllProviders === "function") {
              return window.__salusDisconnectAllProviders();
            }
            return { ok: true };
          });
        }
      } catch {
        // Tab may not allow injection (chrome://, etc.)
      }
    })
  );
}

async function signSessionOnTab(tabId, walletName, challenge) {
  return injectOnTab(
    tabId,
    async (name, msg) => {
      if (typeof window.__salusSignSessionAuth !== "function") {
        throw new Error("Wallet signing failed to load.");
      }
      return window.__salusSignSessionAuth(name, msg);
    },
    [walletName, challenge]
  );
}

async function connectWalletViaProvider(walletName, tabId, tabUrl) {
  await chrome.storage.local.set({
    walletConnecting: walletName,
    walletConnectError: null,
  });

  showConnectNotification(walletName);

  let result;
  let lastError;

  let targetTabId;
  try {
    targetTabId = await resolveConnectTabId(tabId, tabUrl);
    result = await injectWalletConnect(targetTabId, walletName);
  } catch (err) {
    lastError = err;
  }

  if (!result && walletName === "MetaMask") {
    try {
      result = await connectViaDashboard("MetaMask");
    } catch (dashboardErr) {
      lastError = dashboardErr;
    }
  }

  if (!result) {
    const message =
      lastError instanceof Error
        ? lastError.message
        : "Wallet connection was cancelled or failed.";
    await chrome.storage.local.set({
      walletConnecting: null,
      walletConnectError: message,
    });
    throw new Error(message);
  }

  await saveWalletState(result, targetTabId);
  return { ok: true, ...result };
}

async function disconnectWalletViaProvider() {
  const stored = await chrome.storage.local.get([
    "walletName",
    "walletConnectTabId",
  ]);
  const walletName = stored.walletName;

  await disconnectOnAllTabs(walletName);

  await chrome.storage.local.set({
    walletConnected: false,
    walletPublicKey: null,
    walletName: null,
    walletConnectTabId: null,
    walletConnecting: null,
    walletConnectError: null,
    walletSessionSigned: false,
    walletSessionSignature: null,
  });

  return { ok: true };
}

async function signSessionAuth(walletName, relayId, tabId, tabUrl) {
  const stored = await chrome.storage.local.get([
    "walletName",
    "walletConnectTabId",
    "walletPublicKey",
  ]);

  const name = walletName ?? stored.walletName;
  if (!name) {
    throw new Error("Connect a wallet before starting a session.");
  }

  showConnectNotification(name);

  let targetTabId =
    stored.walletConnectTabId ??
    (tabId && isInjectableUrl(tabUrl) ? tabId : null);

  if (targetTabId) {
    try {
      await chrome.tabs.get(targetTabId);
    } catch {
      targetTabId = null;
    }
  }

  if (!targetTabId) {
    targetTabId = await resolveConnectTabId(tabId, tabUrl);
  }

  const challenge = [
    "SalusVPN — Authorize VPN Session",
    `Relay: ${relayId}`,
    `Wallet: ${stored.walletPublicKey ?? "unknown"}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");

  const result = await signSessionOnTab(targetTabId, name, challenge);

  if (!result?.signature?.length) {
    throw new Error("Session signature was cancelled or failed.");
  }

  await chrome.storage.local.set({
    walletSessionSigned: true,
    walletSessionSignature: result.signature,
    walletSessionSignedAt: new Date().toISOString(),
  });

  return { ok: true, publicKey: result.publicKey };
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
    connectWalletViaProvider(message.walletName, message.tabId, message.tabUrl)
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Connect failed",
        })
      );
    return true; // keep channel open until Phantom connect resolves
  }

  if (message.type === "DISCONNECT_WALLET") {
    disconnectWalletViaProvider()
      .then((result) => sendResponse(result))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "SIGN_SESSION_AUTH") {
    signSessionAuth(
      message.walletName,
      message.relayId,
      message.tabId,
      message.tabUrl
    )
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Sign failed",
        })
      );
    return true;
  }

  if (message.type === "CLOSE_CONNECT_TAB" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
    sendResponse({ ok: true });
    return true;
  }
});
