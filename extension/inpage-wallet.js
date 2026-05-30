/**
 * Runs in the page MAIN world. Triggers the wallet extension's native approve UI.
 */
window.__salusConnectWallet = async function salusConnectWallet(walletName) {
  function pubkeyToString(key) {
    if (!key) return null;
    if (typeof key === "string") return key;
    if (typeof key.toBase58 === "function") return key.toBase58();
    if (typeof key.toString === "function") return key.toString();
    return String(key);
  }

  function getMetaMaskProvider() {
    if (window.ethereum?.providers?.length) {
      return window.ethereum.providers.find((p) => p.isMetaMask) ?? null;
    }
    return window.ethereum?.isMetaMask ? window.ethereum : null;
  }

  async function connectPhantom() {
    const provider = window.phantom?.solana;
    if (!provider?.isPhantom) {
      throw new Error(
        "Phantom is not installed. Add the Phantom extension from the Chrome Web Store."
      );
    }

    // Disconnect first so Phantom always shows the Connect / approve window.
    try {
      if (provider.isConnected) {
        await provider.disconnect();
      }
    } catch {
      // ignore disconnect errors
    }

    const response = await provider.connect({ onlyIfTrusted: false });
    const publicKey = pubkeyToString(response?.publicKey ?? provider.publicKey);
    if (!publicKey) {
      throw new Error("Phantom connection was cancelled.");
    }
    return { publicKey, walletName: "Phantom" };
  }

  async function connectSolflare() {
    const provider = window.solflare;
    if (!provider?.isSolflare) {
      throw new Error(
        "Solflare is not installed. Add the Solflare extension from the Chrome Web Store."
      );
    }

    await provider.connect();
    const publicKey = pubkeyToString(provider.publicKey);
    if (!publicKey) {
      throw new Error("Solflare connection was cancelled.");
    }
    return { publicKey, walletName: "Solflare" };
  }

  async function discoverStandardWallets(maxMs) {
    const wallets = [];
    const seen = new Set();

    const onRegister = (event) => {
      const register = event?.detail?.register;
      if (typeof register !== "function") return;
      register((wallet) => {
        const id = wallet?.name ?? wallet;
        if (!seen.has(id)) {
          seen.add(id);
          wallets.push(wallet);
        }
      });
    };

    window.addEventListener("wallet-standard:register-wallet", onRegister);

    const end = Date.now() + maxMs;
    while (Date.now() < end) {
      window.dispatchEvent(new CustomEvent("wallet-standard:app-ready"));
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    window.removeEventListener("wallet-standard:register-wallet", onRegister);
    return wallets;
  }

  async function connectMetaMask() {
    const metamask = getMetaMaskProvider();
    if (!metamask) {
      throw new Error(
        "MetaMask is not installed. Add MetaMask and enable Solana in Settings."
      );
    }

    if (metamask.solana?.connect) {
      try {
        const response = await metamask.solana.connect();
        const publicKey = pubkeyToString(
          response?.publicKey ?? metamask.solana.publicKey
        );
        if (publicKey) return { publicKey, walletName: "MetaMask" };
      } catch (err) {
        if (err?.code !== 4001) console.warn("MetaMask solana.connect:", err);
      }
    }

    if (typeof metamask.request === "function") {
      const snapMethods = [
        {
          method: "wallet_invokeSnap",
          params: {
            snapId: "npm:@metamask/solana-wallet-snap",
            request: { method: "connect" },
          },
        },
        { method: "metamask_solana_connect", params: [] },
        { method: "solana_connect", params: [] },
      ];

      for (const call of snapMethods) {
        try {
          const result = await metamask.request(call);
          const publicKey =
            pubkeyToString(result?.publicKey) ??
            (Array.isArray(result) ? result[0] : null) ??
            (typeof result === "string" ? result : null);
          if (publicKey) return { publicKey, walletName: "MetaMask" };
        } catch (err) {
          if (err?.code === 4001) {
            throw new Error("MetaMask connection was cancelled.");
          }
        }
      }
    }

    const wallets = await discoverStandardWallets(2000);
    const standard = wallets.find((w) => w.name === "MetaMask");
    if (standard) {
      const connectFeature = standard.features?.["standard:connect"];
      if (connectFeature?.connect) {
        const { accounts } = await connectFeature.connect();
        const address = accounts?.[0]?.address;
        if (address) return { publicKey: address, walletName: "MetaMask" };
      }
    }

    throw new Error(
      "MetaMask Solana is not available. In MetaMask go to Settings → enable Solana, then try again."
    );
  }

  if (walletName === "Phantom") return connectPhantom();
  if (walletName === "Solflare") return connectSolflare();
  if (walletName === "MetaMask") return connectMetaMask();

  throw new Error(`Unsupported wallet: ${walletName}`);
};

window.__salusDisconnectWallet = async function salusDisconnectWallet(walletName) {
  if (walletName === "Phantom" && window.phantom?.solana?.disconnect) {
    await window.phantom.solana.disconnect();
  }
  if (walletName === "Solflare" && window.solflare?.disconnect) {
    await window.solflare.disconnect();
  }
  if (walletName === "MetaMask") {
    const metamask = window.ethereum?.providers?.find((p) => p.isMetaMask) ??
      (window.ethereum?.isMetaMask ? window.ethereum : null);
    if (metamask?.solana?.disconnect) await metamask.solana.disconnect();
  }
  return { ok: true };
};
