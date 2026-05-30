importScripts("config.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ selectedRelay: null }, () => {
    console.log("SalusVPN extension installed and storage initialized.");
  });
});

function isDashboardUrl(url) {
  if (!url) return false;
  return (
    url.startsWith(DASHBOARD_URL) ||
    url.startsWith("http://127.0.0.1:3000")
  );
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
      if (tab.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

function ensureDashboardTab() {
  return new Promise((resolve) => {
    const dashboardUrl = `${DASHBOARD_URL}/#session`;

    chrome.tabs.query({}, async (tabs) => {
      const existing = tabs.find((tab) => isDashboardUrl(tab.url));

      if (existing?.id) {
        chrome.tabs.update(
          existing.id,
          { active: true, url: dashboardUrl },
          async () => {
            await waitForTabReady(existing.id);
            resolve(existing.id);
          }
        );
        return;
      }

      chrome.tabs.create({ url: dashboardUrl, active: true }, async (tab) => {
        if (!tab?.id) {
          resolve(null);
          return;
        }
        await waitForTabReady(tab.id);
        resolve(tab.id);
      });
    });
  });
}

async function relayConnectWallet(walletName) {
  await chrome.storage.local.set({ pendingWalletConnect: walletName });
  const tabId = await ensureDashboardTab();

  if (!tabId) {
    throw new Error("Could not open dashboard tab");
  }

  await new Promise((r) => setTimeout(r, 400));

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
});
