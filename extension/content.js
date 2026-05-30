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
    setTimeout(() => relayWalletConnect(walletName), 600);
  });
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.source !== window) return;

  const data = event.data;
  if (!data || data.source !== "salusvpn-dashboard" || data.type !== "WALLET_STATE") {
    return;
  }

  const { connected, publicKey, walletName } = data.payload ?? {};

  chrome.storage.local.set({
    walletConnected: Boolean(connected),
    walletPublicKey: publicKey ?? null,
    walletName: walletName ?? null,
    walletSyncedAt: new Date().toISOString(),
  });
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
