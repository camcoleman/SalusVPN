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
