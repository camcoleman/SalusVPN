const nodeList = document.getElementById("nodes-list");
const walletButton = document.getElementById("wallet-button");
const walletStatus = document.getElementById("wallet-status");
const walletNameEl = document.getElementById("wallet-name");
const walletHint = document.getElementById("wallet-hint");
const walletPicker = document.getElementById("wallet-picker");
const walletPickerCancel = document.getElementById("wallet-picker-cancel");
const settlementMessage = document.getElementById("settlement-message");
const settleDashboardButton = document.getElementById("settle-dashboard-button");
const recommendedBadge = document.getElementById("recommended-badge");
const recommendedNode = document.getElementById("recommended-node");
const recommendedScore = document.getElementById("recommended-score");
const recommendedLatency = document.getElementById("recommended-latency");
const recommendedReason = document.getElementById("recommended-reason");
const sessionNode = document.getElementById("session-node");
const sessionCost = document.getElementById("session-cost");
const connectPill = document.getElementById("connect-pill");
const statusText = document.getElementById("status-text");
const statusRelay = document.getElementById("status-relay");
const sessionButton = document.getElementById("session-button");
const sessionTimer = document.getElementById("session-timer");
const sessionLiveCost = document.getElementById("session-live-cost");
const selectedDetails = document.getElementById("selected-details");
const useRecommendationBtn = document.getElementById("use-recommendation");
const endSessionButton = document.getElementById("end-session-button");
const footerCost = document.getElementById("footer-cost");
const sessionBotRisk = document.getElementById("session-bot-risk");
const sessionHumanLane = document.getElementById("session-human-lane");
const heroTrust = document.getElementById("hero-trust");
const heroLatency = document.getElementById("hero-latency");

let selectedRelay = null;
let sessionActive = false;
let sessionSeconds = 0;
let sessionInterval = null;
let activeSessionId = null;

let walletState = {
  walletConnected: false,
  walletPublicKey: null,
  walletName: null,
};

let apiBase = API_BASE;

function getApiBase() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["dashboardBaseUrl"], (result) => {
      resolve(result.dashboardBaseUrl || API_BASE);
    });
  });
}

function isLocalDevUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

const regionEmoji = {
  "US East": "🇺🇸",
  "US West": "🇺🇸",
  "EU West": "🇪🇺",
  "EU Central": "🇩🇪",
  APAC: "🌏",
};

function formatCurrency(value) {
  return `$${value.toFixed(4)}`;
}

function shortenAddress(address) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function getBestNode(nodes) {
  return nodes.slice().sort((a, b) => {
    if (a.trustScore !== b.trustScore) return b.trustScore - a.trustScore;
    return a.latency - b.latency;
  })[0];
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatShortHash(hash) {
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

function formatAge(timestamp) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function getTrustClass(score) {
  if (score >= 90) return "trust-green";
  if (score >= 70) return "trust-yellow";
  return "trust-red";
}

function isWalletReady() {
  return Boolean(walletState.walletConnected && walletState.walletPublicKey);
}

function buildReason(node) {
  const parts = [];
  if (node.verified) parts.push(`verified ${formatAge(node.lastVerified)}`);
  if (node.humanLaneAvailable) parts.push("human lane");
  if (node.latency < 30) parts.push("low latency");
  parts.push(
    node.trafficQualityScore >= 90 ? "excellent traffic" : "good traffic"
  );
  return parts.join(" · ");
}

function updateRecommendation(node) {
  recommendedBadge.textContent = node.verified ? "Best Overall" : "High Trust";
  recommendedNode.textContent = node.name;
  recommendedScore.textContent = `${node.trustScore}`;
  recommendedScore.className = `trust-val ${getTrustClass(node.trustScore)}`;
  recommendedLatency.textContent = `${node.latency}ms`;
  recommendedReason.textContent = buildReason(node);
}

function updateSelectedDetails() {
  if (!selectedRelay) {
    heroTrust.textContent = "—";
    heroTrust.className = "mstat-val";
    heroLatency.textContent = "—";
    sessionBotRisk.textContent = "--";
    sessionHumanLane.textContent = "--";
    selectedDetails.textContent =
      "Select a relay to view verification details.";
    statusRelay.textContent = "No relay selected";
    return;
  }

  heroTrust.textContent = `${selectedRelay.trustScore}`;
  heroTrust.className = `mstat-val ${getTrustClass(selectedRelay.trustScore)}`;
  heroLatency.textContent = `${selectedRelay.latency}ms`;
  sessionBotRisk.textContent = `${selectedRelay.botRiskScore}%`;
  sessionHumanLane.textContent = selectedRelay.humanLaneAvailable
    ? "Available"
    : "Unavailable";
  selectedDetails.textContent = `Verified ${formatAge(selectedRelay.lastVerified)} · Hash ${formatShortHash(selectedRelay.attestationHash)} · ${selectedRelay.humanLaneAvailable ? "Human lane" : "Standard lane"} · Bot risk ${selectedRelay.botRiskScore}%`;
}

function showWalletPicker(show) {
  walletPicker.hidden = !show;
  walletButton.hidden = show;
}

function updateWalletUI() {
  if (isWalletReady()) {
    walletStatus.textContent = `Connected · ${shortenAddress(walletState.walletPublicKey)}`;
    walletNameEl.textContent = `${walletState.walletName ?? "Wallet"} · Solana Devnet`;
    walletNameEl.style.display = "block";
    walletHint.textContent =
      "Wallet linked. Start VPN to sign each session in Phantom.";
    walletButton.textContent = "Disconnect";
    walletButton.hidden = false;
    showWalletPicker(false);
  } else {
    walletStatus.textContent = "Not connected";
    walletNameEl.style.display = "none";
    walletHint.textContent =
      "Opens your Phantom or MetaMask approval window.";
    walletButton.textContent = "Connect Wallet";
    walletButton.hidden = false;
    showWalletPicker(false);
  }
}

function connectWallet(walletName) {
  showWalletPicker(false);
  walletPicker.querySelectorAll(".wallet-option").forEach((btn) => {
    btn.disabled = true;
  });

  chrome.storage.local.set({
    walletConnecting: walletName,
    walletConnectError: null,
  });

  walletHint.textContent = `Look for the ${walletName} icon in your toolbar and approve.`;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    chrome.runtime.sendMessage({
      type: "CONNECT_WALLET",
      walletName,
      tabId: tab?.id ?? null,
      tabUrl: tab?.url ?? null,
    });
    walletPicker.querySelectorAll(".wallet-option").forEach((btn) => {
      btn.disabled = false;
    });
  });
}

function disconnectWallet() {
  chrome.runtime.sendMessage({ type: "DISCONNECT_WALLET" }, () => {
    loadWalletState();
  });
}

function handleWalletButtonClick() {
  if (isWalletReady()) {
    disconnectWallet();
    return;
  }
  showWalletPicker(true);
}

function updateConnectionUI() {
  statusText.textContent = sessionActive ? "Connected" : "Disconnected";
  connectPill.classList.toggle("pill--on", sessionActive);
  connectPill.classList.toggle("pill--off", !sessionActive);
  sessionButton.textContent = sessionActive ? "Active" : "Start";
  sessionButton.disabled =
    sessionActive || !isWalletReady() || !selectedRelay;
  endSessionButton.disabled = !sessionActive;
}

function updateTimer() {
  sessionTimer.textContent = formatDuration(sessionSeconds);

  let liveCost = 0;
  if (selectedRelay) {
    const metrics = getSessionMetrics(
      sessionSeconds,
      selectedRelay.pricePerSession
    );
    liveCost = metrics.accruedCostUSDC;
  }

  sessionLiveCost.textContent = formatCurrency(liveCost);
  footerCost.textContent = formatCurrency(liveCost);
  chrome.storage.local.set({ sessionSeconds });
}

function loadWalletState() {
  chrome.storage.local.get(
    [
      "walletConnected",
      "walletPublicKey",
      "walletName",
      "walletConnecting",
      "walletConnectError",
      "pendingSettlementSessionId",
    ],
    (result) => {
      walletState = {
        walletConnected: Boolean(result.walletConnected),
        walletPublicKey: result.walletPublicKey ?? null,
        walletName: result.walletName ?? null,
      };
      updateWalletUI();
      updateConnectionUI();

      if (result.walletConnecting && !result.walletConnected) {
        walletHint.textContent = `Approve the ${result.walletConnecting} popup, then reopen SalusVPN.`;
      } else if (result.walletConnectError && !result.walletConnected) {
        walletHint.textContent = result.walletConnectError;
      }

      if (result.pendingSettlementSessionId) {
        settlementMessage.style.display = "block";
        settlementMessage.textContent =
          "Session ended. Complete USDC settlement on the dashboard.";
        settleDashboardButton.style.display = "block";
      } else {
        settlementMessage.style.display = "none";
        settleDashboardButton.style.display = "none";
      }
    }
  );
}

function watchWalletState() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (
      changes.walletConnected ||
      changes.walletPublicKey ||
      changes.walletName ||
      changes.walletConnecting ||
      changes.walletConnectError
    ) {
      loadWalletState();
    }
  });
}

async function openDashboardConnect() {
  const base = await getApiBase();
  const dashboardUrl = `${base}/#session`;

  chrome.tabs.query({}, (tabs) => {
    const existing = tabs.find((tab) => isLocalDevUrl(tab.url));

    if (existing?.id) {
      chrome.tabs.update(existing.id, { active: true, url: dashboardUrl });
      return;
    }

    chrome.tabs.create({ url: dashboardUrl });
  });
}

function requestSessionSignature() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      chrome.runtime.sendMessage(
        {
          type: "SIGN_SESSION_AUTH",
          walletName: walletState.walletName,
          relayId: selectedRelay?.id,
          tabId: tab?.id ?? null,
          tabUrl: tab?.url ?? null,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response?.ok) {
            reject(new Error(response?.error ?? "Signature cancelled."));
            return;
          }
          resolve(response);
        }
      );
    });
  });
}

async function startSession() {
  if (!selectedRelay) {
    walletHint.textContent = "Select a relay before starting.";
    return;
  }

  if (!isWalletReady()) {
    walletHint.textContent = "Connect a wallet first.";
    showWalletPicker(true);
    return;
  }

  sessionButton.disabled = true;
  walletHint.textContent = `Sign in ${walletState.walletName} to start the VPN session…`;

  try {
    await requestSessionSignature();
  } catch (error) {
    sessionButton.disabled = false;
    walletHint.textContent =
      error instanceof Error ? error.message : "Signature required to start.";
    updateConnectionUI();
    return;
  }

  try {
    const base = await getApiBase();
    const response = await fetch(`${base}/api/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedNodeId: selectedRelay.id }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to start session");
    }

    const data = await response.json();
    activeSessionId = data.sessionId;
    sessionActive = true;
    sessionSeconds = 0;

    chrome.storage.local.set({
      sessionActive: true,
      activeSessionId: data.sessionId,
      pendingSettlementSessionId: null,
    });

    settlementMessage.style.display = "none";
    settleDashboardButton.style.display = "none";

    updateConnectionUI();
    updateTimer();

    if (sessionInterval) clearInterval(sessionInterval);
    sessionInterval = setInterval(() => {
      sessionSeconds += 1;
      updateTimer();
    }, 1000);
  } catch (error) {
    walletHint.textContent =
      error instanceof Error ? error.message : "Failed to start session.";
    chrome.storage.local.set({ walletSessionSigned: false });
  } finally {
    updateConnectionUI();
  }
}

async function endSession() {
  if (sessionInterval) {
    clearInterval(sessionInterval);
    sessionInterval = null;
  }

  if (activeSessionId && selectedRelay) {
    const metrics = getSessionMetrics(
      sessionSeconds,
      selectedRelay.pricePerSession
    );

    try {
      const base = await getApiBase();
      const response = await fetch(`${base}/api/session/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          selectedNodeId: selectedRelay.id,
          bandwidthUsedMB: metrics.bandwidthMB,
          accruedCostUSDC: metrics.accruedCostUSDC,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to end session");
      }

      chrome.storage.local.set({
        pendingSettlementSessionId: activeSessionId,
      });

      settlementMessage.style.display = "block";
      settlementMessage.textContent =
        "Session ended. Open dashboard to complete USDC settlement.";
      settleDashboardButton.style.display = "block";
    } catch (error) {
      walletHint.textContent =
        error instanceof Error ? error.message : "Failed to end session.";
    }
  }

  sessionActive = false;
  activeSessionId = null;

  chrome.storage.local.set({
    sessionActive: false,
    activeSessionId: null,
    walletSessionSigned: false,
    walletSessionSignature: null,
  });

  updateConnectionUI();
}

function setSelectedNode(node, persist = true) {
  selectedRelay = node;
  statusRelay.textContent = node.name;
  sessionNode.textContent = node.name;
  sessionCost.textContent = formatCurrency(node.pricePerSession);
  if (persist) chrome.storage.local.set({ selectedRelay: node.id });
  updateSelectedDetails();
  updateConnectionUI();

  document.querySelectorAll(".relay-row").forEach((row) => {
    row.classList.toggle("selected", row.dataset.nodeId === node.id);
  });
}

function renderNodeRow(node) {
  const row = document.createElement("div");
  row.className = "relay-row";
  row.dataset.nodeId = node.id;
  const emoji = regionEmoji[node.region] || "🌐";

  row.innerHTML = `
    <div>
      <div class="relay-name">${node.name}</div>
      <div class="relay-region">${emoji} ${node.region}</div>
    </div>
    <span class="relay-trust ${getTrustClass(node.trustScore)}">${node.trustScore}</span>
    <span class="relay-latency">${node.latency}ms</span>
    <span class="relay-price">${formatCurrency(node.pricePerSession)}</span>
    <button class="relay-select" title="Select ${node.name}">→</button>
  `;

  row.querySelector(".relay-select").addEventListener("click", (e) => {
    e.stopPropagation();
    setSelectedNode(node);
  });
  row.addEventListener("click", () => setSelectedNode(node));
  return row;
}

function refreshNodeList(nodes) {
  nodeList.innerHTML = "";
  nodes.forEach((node) => nodeList.appendChild(renderNodeRow(node)));
}

function restoreState(nodes) {
  chrome.storage.local.get(
    ["selectedRelay", "sessionActive", "sessionSeconds", "activeSessionId"],
    (result) => {
      if (result.selectedRelay) {
        const selected = nodes.find((node) => node.id === result.selectedRelay);
        if (selected) setSelectedNode(selected, false);
      }

      sessionActive = result.sessionActive || false;
      sessionSeconds = result.sessionSeconds || 0;
      activeSessionId = result.activeSessionId || null;
      updateConnectionUI();

      if (sessionActive && isWalletReady()) {
        if (sessionInterval) clearInterval(sessionInterval);
        sessionInterval = setInterval(() => {
          sessionSeconds += 1;
          updateTimer();
        }, 1000);
        updateTimer();
      } else if (sessionActive) {
        sessionActive = false;
        chrome.storage.local.set({ sessionActive: false });
        updateConnectionUI();
      } else {
        updateTimer();
      }
    }
  );
}

walletButton.addEventListener("click", handleWalletButtonClick);
walletPickerCancel.addEventListener("click", () => showWalletPicker(false));
walletPicker.querySelectorAll(".wallet-option").forEach((button) => {
  button.addEventListener("click", () => {
    connectWallet(button.dataset.wallet);
  });
});
settleDashboardButton.addEventListener("click", openDashboardConnect);
sessionButton.addEventListener("click", startSession);
useRecommendationBtn.addEventListener("click", () =>
  setSelectedNode(getBestNode(relayNodes))
);
endSessionButton.addEventListener("click", endSession);

window.addEventListener("DOMContentLoaded", () => {
  if (!Array.isArray(relayNodes)) return;
  getApiBase().then((base) => {
    apiBase = base;
  });
  const best = getBestNode(relayNodes);
  updateRecommendation(best);
  refreshNodeList(relayNodes);
  loadWalletState();
  watchWalletState();
  restoreState(relayNodes);
});
