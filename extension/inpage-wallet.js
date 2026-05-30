/**
 * Runs in the page MAIN world (not extension isolated world).
 * Calls the wallet extension's provider so Phantom/MetaMask show their native approve UI.
 */
window.__salusConnectWallet = async function salusConnectWallet(walletName) {
  function pubkeyToString(key) {
    if (!key) return null;
    if (typeof key === "string") return key;
    if (typeof key.toBase58 === "function") return key.toBase58();
    if (typeof key.toString === "function") return key.toString();
    return String(key);
  }

  async function connectPhantom() {
    const provider = window.phantom?.solana;
    if (!provider?.isPhantom) {
      throw new Error(
        "Phantom extension not found. Install Phantom from the Chrome Web Store."
      );
    }
    const response = await provider.connect();
    const publicKey = pubkeyToString(response?.publicKey ?? provider.publicKey);
    if (!publicKey) throw new Error("Phantom did not return a public key.");
    return { publicKey, walletName: "Phantom" };
  }

  async function connectSolflare() {
    const provider = window.solflare;
    if (!provider?.isSolflare) {
      throw new Error(
        "Solflare extension not found. Install Solflare from the Chrome Web Store."
      );
    }
    await provider.connect();
    const publicKey = pubkeyToString(provider.publicKey);
    if (!publicKey) throw new Error("Solflare did not return a public key.");
    return { publicKey, walletName: "Solflare" };
  }

  async function discoverStandardWallets() {
    const wallets = [];

    const onRegister = (event) => {
      const register = event?.detail?.register;
      if (typeof register === "function") {
        register((wallet) => wallets.push(wallet));
      }
    };

    window.addEventListener("wallet-standard:register-wallet", onRegister);
    window.dispatchEvent(new CustomEvent("wallet-standard:app-ready"));

    await new Promise((resolve) => setTimeout(resolve, 400));

    window.removeEventListener("wallet-standard:register-wallet", onRegister);
    return wallets;
  }

  async function connectMetaMask() {
    const legacy = window.ethereum?.providers?.find((p) => p.isMetaMask) ??
      (window.ethereum?.isMetaMask ? window.ethereum : null);

    if (legacy?.solana?.connect) {
      const response = await legacy.solana.connect();
      const publicKey = pubkeyToString(
        response?.publicKey ?? legacy.solana.publicKey
      );
      if (publicKey) return { publicKey, walletName: "MetaMask" };
    }

    const wallets = await discoverStandardWallets();
    const metamask = wallets.find((w) => w.name === "MetaMask");
    if (!metamask) {
      throw new Error(
        "MetaMask Solana not found. Open MetaMask, enable Solana, and try again."
      );
    }

    const connectFeature = metamask.features?.["standard:connect"];
    if (!connectFeature?.connect) {
      throw new Error("MetaMask does not support standard connect on this page.");
    }

    const { accounts } = await connectFeature.connect();
    const address = accounts?.[0]?.address;
    if (!address) throw new Error("MetaMask did not return a Solana account.");
    return { publicKey: address, walletName: "MetaMask" };
  }

  if (walletName === "Phantom") return connectPhantom();
  if (walletName === "Solflare") return connectSolflare();
  if (walletName === "MetaMask") return connectMetaMask();

  throw new Error(`Unsupported wallet: ${walletName}`);
};

window.__salusDisconnectWallet = async function salusDisconnectWallet(walletName) {
  if (walletName === "Phantom" && window.phantom?.solana?.disconnect) {
    await window.phantom.solana.disconnect();
    return { ok: true };
  }
  if (walletName === "Solflare" && window.solflare?.disconnect) {
    await window.solflare.disconnect();
    return { ok: true };
  }
  if (walletName === "MetaMask") {
    const legacy = window.ethereum?.providers?.find((p) => p.isMetaMask) ??
      (window.ethereum?.isMetaMask ? window.ethereum : null);
    if (legacy?.solana?.disconnect) await legacy.solana.disconnect();
  }
  return { ok: true };
};
