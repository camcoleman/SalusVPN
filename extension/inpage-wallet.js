/**
 * Runs in the page MAIN world. Triggers the wallet extension's native approve UI.
 */

function salusPubkeyToString(key) {
  if (!key) return null;
  if (typeof key === "string") return key;
  if (typeof key.toBase58 === "function") return key.toBase58();
  if (typeof key.toString === "function") return key.toString();
  return String(key);
}

function salusGetMetaMaskProvider() {
  if (window.ethereum?.providers?.length) {
    return window.ethereum.providers.find((p) => p.isMetaMask) ?? null;
  }
  return window.ethereum?.isMetaMask ? window.ethereum : null;
}

async function salusForceDisconnectPhantom() {
  const provider = window.phantom?.solana;
  if (!provider?.disconnect) return;
  try {
    await provider.disconnect();
  } catch {
    // ignore
  }
}

window.__salusConnectWallet = async function salusConnectWallet(walletName) {
  async function connectPhantom() {
    const provider = window.phantom?.solana;
    if (!provider?.isPhantom) {
      throw new Error(
        "Phantom is not installed. Add the Phantom extension from the Chrome Web Store."
      );
    }

    await salusForceDisconnectPhantom();

    const response = await provider.connect({ onlyIfTrusted: false });
    const publicKey = salusPubkeyToString(
      response?.publicKey ?? provider.publicKey
    );
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

    try {
      if (provider.isConnected) await provider.disconnect();
    } catch {
      // ignore
    }

    await provider.connect();
    const publicKey = salusPubkeyToString(provider.publicKey);
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
    const metamask = salusGetMetaMaskProvider();
    if (!metamask) {
      throw new Error(
        "MetaMask is not installed. Add MetaMask and enable Solana in Settings."
      );
    }

    if (metamask.solana?.disconnect) {
      try {
        await metamask.solana.disconnect();
      } catch {
        // ignore
      }
    }

    if (metamask.solana?.connect) {
      try {
        const response = await metamask.solana.connect();
        const publicKey = salusPubkeyToString(
          response?.publicKey ?? metamask.solana.publicKey
        );
        if (publicKey) return { publicKey, walletName: "MetaMask" };
      } catch (err) {
        if (err?.code === 4001) {
          throw new Error("MetaMask connection was cancelled.");
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
  if (walletName === "Phantom") await salusForceDisconnectPhantom();
  if (walletName === "Solflare" && window.solflare?.disconnect) {
    try {
      await window.solflare.disconnect();
    } catch {
      // ignore
    }
  }
  if (walletName === "MetaMask") {
    const metamask = salusGetMetaMaskProvider();
    if (metamask?.solana?.disconnect) {
      try {
        await metamask.solana.disconnect();
      } catch {
        // ignore
      }
    }
  }
  return { ok: true };
};

window.__salusDisconnectAllProviders = async function salusDisconnectAllProviders() {
  await salusForceDisconnectPhantom();
  if (window.solflare?.disconnect) {
    try {
      await window.solflare.disconnect();
    } catch {
      // ignore
    }
  }
  const metamask = salusGetMetaMaskProvider();
  if (metamask?.solana?.disconnect) {
    try {
      await metamask.solana.disconnect();
    } catch {
      // ignore
    }
  }
  return { ok: true };
};

window.__salusSignSessionAuth = async function salusSignSessionAuth(
  walletName,
  challenge
) {
  const messageBytes = new TextEncoder().encode(challenge);

  if (walletName === "Phantom") {
    const provider = window.phantom?.solana;
    if (!provider?.isPhantom) {
      throw new Error("Phantom is not installed.");
    }
    if (!provider.isConnected) {
      await provider.connect({ onlyIfTrusted: false });
    }
    const { signature } = await provider.signMessage(messageBytes, "utf8");
    return {
      publicKey: salusPubkeyToString(provider.publicKey),
      signature: Array.from(signature),
    };
  }

  if (walletName === "Solflare") {
    const provider = window.solflare;
    if (!provider?.isSolflare) throw new Error("Solflare is not installed.");
    if (!provider.isConnected) await provider.connect();
    if (provider.signMessage) {
      const sig = await provider.signMessage(messageBytes, "utf8");
      return {
        publicKey: salusPubkeyToString(provider.publicKey),
        signature: Array.from(sig?.signature ?? sig ?? []),
      };
    }
    throw new Error("Solflare signMessage is not available.");
  }

  if (walletName === "MetaMask") {
    const metamask = salusGetMetaMaskProvider();
    if (!metamask) throw new Error("MetaMask is not installed.");
    if (metamask.solana?.signMessage) {
      const result = await metamask.solana.signMessage(messageBytes, "utf8");
      return {
        publicKey: salusPubkeyToString(
          result?.publicKey ?? metamask.solana.publicKey
        ),
        signature: Array.from(result?.signature ?? []),
      };
    }
    throw new Error("MetaMask Solana signing is not available.");
  }

  throw new Error(`Unsupported wallet: ${walletName}`);
};
