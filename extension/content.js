function postToPage(type, payload) {
  window.postMessage(
    {
      source: "salusvpn-extension",
      type,
      payload,
    },
    window.location.origin
  );
}

function relayWalletConnect(walletName) {
  postToPage("CONNECT_WALLET", { walletName });
}

function flushPendingConnect() {
  chrome.storage.local.get(["pendingWalletConnect"], (result) => {
    if (!result.pendingWalletConnect) return;

    const walletName = result.pendingWalletConnect;
    chrome.storage.local.remove("pendingWalletConnect");
    setTimeout(() => relayWalletConnect(walletName), 800);
  });
}

function syncWalletState(payload) {
  const { connected, publicKey, walletName } = payload ?? {};

  chrome.storage.local.set({
    walletConnected: Boolean(connected),
    walletPublicKey: publicKey ?? null,
    walletName: walletName ?? null,
    walletSyncedAt: new Date().toISOString(),
    dashboardBaseUrl: window.location.origin,
  });
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.source !== window) return;

  const data = event.data;
  if (!data || data.source !== "salusvpn-dashboard") return;

  if (data.type === "WALLET_STATE") {
    syncWalletState(data.payload);
    return;
  }

  if (
    data.type === "CONNECT_COMPLETE" &&
    window.location.pathname === "/connect"
  ) {
    chrome.runtime.sendMessage({ type: "CLOSE_CONNECT_TAB" });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CONNECT_WALLET") {
    relayWalletConnect(message.walletName);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "DISCONNECT_WALLET") {
    postToPage("DISCONNECT_WALLET", {});
    sendResponse({ ok: true });
    return true;
  }
});

flushPendingConnect();
