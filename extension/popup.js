const nodeList = document.getElementById("nodes-list");
const walletButton = document.getElementById("wallet-button");
const walletStatus = document.getElementById("wallet-status");
const walletNameEl = document.getElementById("wallet-name");
const walletBalanceEl = document.getElementById("wallet-balance");
const walletHint = document.getElementById("wallet-hint");
const walletPicker = document.getElementById("wallet-picker");
const walletPickerCancel = document.getElementById("wallet-picker-cancel");
const settlementMessage = document.getElementById("settlement-message");
const settlementTxRow = document.getElementById("settlement-tx-row");
const settlementTxLink = document.getElementById("settlement-tx-link");
const settleRetryButton = document.getElementById("settle-retry-button");
const settleDashboardButton = document.getElementById("settle-dashboard-button");
const pendingCard = document.getElementById("pending-card");
const pendingCountBadge = document.getElementById("pending-count-badge");
const pendingSummary = document.getElementById("pending-summary");
const pendingList = document.getElementById("pending-list");
const settleAllButton = document.getElementById("settle-all-button");
const pendingError = document.getElementById("pending-error");
const autoSettleEnabled = document.getElementById("auto-settle-enabled");
const autoSettleThreshold = document.getElementById("auto-settle-threshold");
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
const stopSessionButton = document.getElementById("stop-session-button");
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
let activeSessionId = null;

let walletState = {
  walletConnected: false,
  walletPublicKey: null,
  walletName: null,
};

let apiBase = API_BASE;

const SETTLEMENT_PER_SESSION_USDC = 0.001;
const DEFAULT_AUTO_SETTLE_THRESHOLD = 5;

let pendingQueue = {
  sessions: [],
  count: 0,
  totalAmountUSDC: 0,
};

function formatPendingAge(iso) {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

async function loadPendingQueue() {
  if (!isWalletReady()) {
    pendingQueue = { sessions: [], count: 0, totalAmountUSDC: 0 };
    renderPendingQueue();
    return;
  }

  try {
    const base = await getApiBase();
    const url = `${base}/api/session/pending-settlement?walletPublicKey=${encodeURIComponent(walletState.walletPublicKey)}`;
    const response = await fetch(url);
    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.error || "Failed to load pending payments.");
    }

    pendingQueue = {
      sessions: data.sessions ?? [],
      count: data.count ?? 0,
      totalAmountUSDC: data.totalAmountUSDC ?? 0,
    };

    await chrome.storage.local.set({
      pendingSessionIds: pendingQueue.sessions.map((s) => s.sessionId),
      pendingSettlementCount: pendingQueue.count,
      pendingSettlementTotalUSDC: pendingQueue.totalAmountUSDC,
    });

    renderPendingQueue();
  } catch (error) {
    pendingError.style.display = "block";
    pendingError.textContent =
      error instanceof Error ? error.message : "Failed to load pending queue.";
    renderPendingQueue();
  }
}

function renderPendingQueue() {
  const { sessions, count, totalAmountUSDC } = pendingQueue;

  pendingCountBadge.textContent = String(count);

  if (count === 0) {
    pendingSummary.textContent = "No unpaid sessions.";
    pendingList.innerHTML = "";
    settleAllButton.style.display = "none";
    pendingError.style.display = "none";
    return;
  }

  pendingSummary.textContent = `${count} session${count === 1 ? "" : "s"} · ${formatCurrency(totalAmountUSDC)} total`;
  pendingList.innerHTML = "";

  sessions.forEach((session) => {
    const row = document.createElement("div");
    row.className = "pending-item";
    row.innerHTML = `
      <div>
        <div class="pending-item-name">${session.nodeName}</div>
        <div class="pending-item-meta">${formatPendingAge(session.endedAt)}</div>
      </div>
      <span class="pending-item-meta">${formatCurrency(session.settlementAmountUSDC ?? SETTLEMENT_PER_SESSION_USDC)}</span>
    `;
    pendingList.appendChild(row);
  });

  settleAllButton.style.display = "block";
  settleAllButton.textContent = `Settle ${count} session${count === 1 ? "" : "s"} (${formatCurrency(totalAmountUSDC)})`;
  settleAllButton.disabled = !isWalletReady();
}

function loadAutoSettleSettings() {
  chrome.storage.local.get(
    ["autoSettleEnabled", "autoSettleSessionThreshold"],
    (result) => {
      autoSettleEnabled.checked = Boolean(result.autoSettleEnabled);
      autoSettleThreshold.value = String(
        result.autoSettleSessionThreshold ?? DEFAULT_AUTO_SETTLE_THRESHOLD
      );
    }
  );
}

function saveAutoSettleSettings() {
  const threshold = Math.max(
    1,
    Math.min(20, Number(autoSettleThreshold.value) || DEFAULT_AUTO_SETTLE_THRESHOLD)
  );
  autoSettleThreshold.value = String(threshold);
  chrome.storage.local.set({
    autoSettleEnabled: autoSettleEnabled.checked,
    autoSettleSessionThreshold: threshold,
  });
}

async function maybeAutoSettle() {
  const settings = await new Promise((resolve) => {
    chrome.storage.local.get(
      ["autoSettleEnabled", "autoSettleSessionThreshold"],
      resolve
    );
  });

  if (!settings.autoSettleEnabled) return;

  const threshold =
    settings.autoSettleSessionThreshold ?? DEFAULT_AUTO_SETTLE_THRESHOLD;

  if (pendingQueue.count >= threshold) {
    const sessionIds = pendingQueue.sessions.map((s) => s.sessionId);
    await runBatchSettlement(sessionIds);
  }
}

async function runBatchSettlement(sessionIds) {
  if (!sessionIds?.length) {
    await loadPendingQueue();
    return false;
  }

  if (!isWalletReady()) {
    pendingError.style.display = "block";
    pendingError.textContent = "Connect wallet to settle pending payments.";
    return false;
  }

  settleAllButton.disabled = true;
  settleRetryButton.disabled = true;
  pendingError.style.display = "none";
  walletHint.textContent = `Approve batch USDC payment (${sessionIds.length} sessions) in Phantom…`;

  try {
    const base = await getApiBase();
    const buildResponse = await fetch(`${base}/api/session/build-batch-settle-tx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionIds,
        walletPublicKey: walletState.walletPublicKey,
      }),
    });

    const buildData = await parseJsonResponse(buildResponse);
    if (!buildResponse.ok) {
      throw new Error(buildData.error || "Could not build batch settlement transaction.");
    }

    const signResult = await requestSettlementSign(buildData.transaction);

    const settleResponse = await fetch(`${base}/api/session/settle-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionIds: buildData.sessionIds ?? sessionIds,
        transactionSignature: signResult.signature,
        walletPublicKey: walletState.walletPublicKey,
      }),
    });

    if (!settleResponse.ok) {
      const settleData = await parseJsonResponse(settleResponse);
      throw new Error(settleData.error || "Failed to record batch settlement.");
    }

    await chrome.storage.local.set({
      pendingSettlementSessionId: null,
      pendingSessionIds: [],
      settlementError: null,
      lastSettlementSignature: signResult.signature,
      lastSettlementStatus: "settled",
      pendingSettlementCount: 0,
      pendingSettlementTotalUSDC: 0,
    });

    showSettlementSuccess(signResult.signature);
    walletHint.textContent = `Batch payment complete (${buildData.sessionCount ?? sessionIds.length} sessions).`;
    await loadPendingQueue();
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Batch settlement failed.";
    await chrome.storage.local.set({ settlementError: message });
    pendingError.style.display = "block";
    pendingError.textContent = message;
    walletHint.textContent = message;
    showSettlementPending(message);
    return false;
  } finally {
    settleAllButton.disabled = !isWalletReady();
    settleRetryButton.disabled = false;
  }
}

function getApiBase() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["dashboardBaseUrl"], (result) => {
      resolve(result.dashboardBaseUrl || API_BASE);
    });
  });
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const hint =
      text.includes("Internal Server Error") || response.status >= 500
        ? "Dashboard server error — stop other dev servers, run: rm -rf .next && npm run dev"
        : text.slice(0, 200);
    throw new Error(hint);
  }
}

function clearLocalSession() {
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

async function validateStoredSession(sessionId) {
  if (!sessionId) return false;

  try {
    const base = await getApiBase();
    const response = await fetch(
      `${base}/api/session/status?sessionId=${encodeURIComponent(sessionId)}`
    );
    if (!response.ok) return false;

    const data = await parseJsonResponse(response);
    return data.status === "active";
  } catch {
    return false;
  }
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

async function fetchDevnetSolBalance(publicKey) {
  const response = await fetch("https://api.devnet.solana.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [publicKey],
    }),
  });
  const data = await response.json();
  return (data.result?.value ?? 0) / 1_000_000_000;
}

async function refreshDevnetBalances() {
  if (!walletState.walletPublicKey) {
    walletBalanceEl.style.display = "none";
    return;
  }

  try {
    const sol = await fetchDevnetSolBalance(walletState.walletPublicKey);
    walletBalanceEl.style.display = "block";
    walletBalanceEl.textContent = `Devnet SOL (on-chain): ${sol.toFixed(4)}`;

    if (sol < 0.001) {
      walletHint.textContent =
        "Devnet SOL is 0 on-chain. In Phantom: Settings → Developer Settings → enable Testnet Mode → select Devnet (not Mainnet). Then use faucet.solana.com with Devnet selected.";
    } else if (isWalletReady()) {
      walletHint.textContent =
        "Wallet linked. Start VPN to sign each session in Phantom.";
    }
  } catch {
    walletBalanceEl.style.display = "none";
  }
}

function updateWalletUI() {
  if (isWalletReady()) {
    walletStatus.textContent = `Connected · ${shortenAddress(walletState.walletPublicKey)}`;
    walletNameEl.textContent = `${walletState.walletName ?? "Wallet"} · use Devnet in Phantom`;
    walletNameEl.style.display = "block";
    walletButton.textContent = "Disconnect";
    walletButton.hidden = false;
    showWalletPicker(false);
    void refreshDevnetBalances();
  } else {
    walletStatus.textContent = "Not connected";
    walletNameEl.style.display = "none";
    walletBalanceEl.style.display = "none";
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

  chrome.runtime.sendMessage({
    type: "CONNECT_WALLET",
    walletName,
    tabId: null,
    tabUrl: null,
  });
  walletPicker.querySelectorAll(".wallet-option").forEach((btn) => {
    btn.disabled = false;
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
  sessionButton.hidden = sessionActive;
  sessionButton.disabled = !isWalletReady() || !selectedRelay;
  stopSessionButton.hidden = !sessionActive;
  stopSessionButton.disabled = !sessionActive;
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
      "lastSettlementSignature",
      "lastSettlementStatus",
      "settlementError",
    ],
    (result) => {
      walletState = {
        walletConnected: Boolean(result.walletConnected),
        walletPublicKey: result.walletPublicKey ?? null,
        walletName: result.walletName ?? null,
      };
      updateWalletUI();
      updateConnectionUI();
      void loadPendingQueue();

      if (result.walletConnecting && !result.walletConnected) {
        walletHint.textContent = `Approve the ${result.walletConnecting} popup, then reopen SalusVPN.`;
      } else if (result.walletConnectError && !result.walletConnected) {
        walletHint.textContent = result.walletConnectError;
      }

      if (
        result.lastSettlementSignature &&
        result.lastSettlementStatus === "settled"
      ) {
        showSettlementSuccess(result.lastSettlementSignature);
      } else if (result.settlementError) {
        pendingError.style.display = "block";
        pendingError.textContent = result.settlementError;
      } else {
        clearSettlementUI();
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

    if (changes.pendingSettlementCount || changes.pendingSessionIds) {
      void loadPendingQueue();
    }
  });
}

function watchSessionState() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes.sessionSeconds) {
      sessionSeconds = changes.sessionSeconds.newValue ?? 0;
      updateTimer();
    }

    if (changes.sessionActive) {
      sessionActive = Boolean(changes.sessionActive.newValue);
      updateConnectionUI();
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
    chrome.runtime.sendMessage(
      {
        type: "SIGN_SESSION_AUTH",
        walletName: walletState.walletName,
        relayId: selectedRelay?.id,
        tabId: null,
        tabUrl: null,
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
      const data = await parseJsonResponse(response);
      throw new Error(data.error || "Failed to start session");
    }

    const data = await parseJsonResponse(response);
    activeSessionId = data.sessionId;
    sessionActive = true;
    sessionSeconds = 0;

    chrome.storage.local.set({
      sessionActive: true,
      activeSessionId: data.sessionId,
      sessionSeconds: 0,
      sessionHud: {
        relayName: selectedRelay.name,
        trustScore: selectedRelay.trustScore,
        latency: selectedRelay.latency,
        pricePerSession: selectedRelay.pricePerSession,
      },
      pendingSettlementSessionId: null,
      lastSettlementSignature: null,
      lastSettlementStatus: null,
      settlementError: null,
    });

    chrome.runtime.sendMessage({ type: "OPEN_SESSION_HUD" });

    clearSettlementUI();

    updateConnectionUI();
    updateTimer();
  } catch (error) {
    walletHint.textContent =
      error instanceof Error ? error.message : "Failed to start session.";
    chrome.storage.local.set({ walletSessionSigned: false });
  } finally {
    updateConnectionUI();
  }
}

function showSettlementSuccess(signature) {
  settlementMessage.style.display = "block";
  settlementMessage.textContent = "Settlement confirmed on devnet.";
  settlementTxRow.style.display = "block";
  settlementTxLink.textContent = shortenSignature(signature);
  settlementTxLink.href = getDevnetExplorerUrl(signature);
  settleRetryButton.style.display = "none";
  settleDashboardButton.style.display = "none";
}

function showSettlementPending(message) {
  settlementMessage.style.display = "block";
  settlementMessage.textContent = message;
  settlementTxRow.style.display = "none";
  settleRetryButton.style.display = "block";
  settleDashboardButton.style.display = "block";
}

function clearSettlementUI() {
  settlementMessage.style.display = "none";
  settlementTxRow.style.display = "none";
  settleRetryButton.style.display = "none";
  settleDashboardButton.style.display = "none";
}

function requestSettlementSign(serializedTx) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "SETTLE_SESSION",
        walletName: walletState.walletName,
        serializedTx,
        tabId: null,
        tabUrl: null,
      },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response?.ok) {
            reject(new Error(response?.error ?? "Settlement cancelled."));
            return;
          }
          resolve(response);
        }
      );
  });
}

async function runSettlement(sessionId) {
  return runBatchSettlement([sessionId]);
}

async function endSession() {
  const endedSessionId = activeSessionId;

  if (endedSessionId && selectedRelay) {
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
          sessionId: endedSessionId,
          selectedNodeId: selectedRelay.id,
          bandwidthUsedMB: metrics.bandwidthMB,
          accruedCostUSDC: metrics.accruedCostUSDC,
          walletPublicKey: walletState.walletPublicKey ?? undefined,
        }),
      });

      if (!response.ok) {
        const data = await parseJsonResponse(response);
        if (response.status === 404) {
          clearLocalSession();
          throw new Error(
            "Session expired — dev server restarted. Start a new session."
          );
        }
        if (
          response.status === 409 &&
          String(data.error ?? "").includes("already ended")
        ) {
          sessionActive = false;
          activeSessionId = null;
          chrome.storage.local.set({
            sessionActive: false,
            activeSessionId: null,
            walletSessionSigned: false,
            walletSessionSignature: null,
          });
          updateConnectionUI();
          await loadPendingQueue();
          await maybeAutoSettle();
          return;
        }
        throw new Error(data.error || "Failed to end session");
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

      walletHint.textContent =
        "Session queued for batch settlement. Settle when ready or enable auto-settle.";
      await loadPendingQueue();
      await maybeAutoSettle();
    } catch (error) {
      walletHint.textContent =
        error instanceof Error ? error.message : "Failed to end session.";
    }
    return;
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
    async (result) => {
      if (result.selectedRelay) {
        const selected = nodes.find((node) => node.id === result.selectedRelay);
        if (selected) setSelectedNode(selected, false);
      }

      sessionActive = result.sessionActive || false;
      sessionSeconds = result.sessionSeconds || 0;
      activeSessionId = result.activeSessionId || null;

      if (sessionActive && activeSessionId) {
        const stillActive = await validateStoredSession(activeSessionId);
        if (!stillActive) {
          sessionActive = false;
          activeSessionId = null;
          chrome.storage.local.set({
            sessionActive: false,
            activeSessionId: null,
          });
          walletHint.textContent =
            "Previous session expired. Start a new session.";
        }
      }

      updateConnectionUI();
      updateTimer();
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
settleRetryButton.addEventListener("click", () => {
  const sessionIds = pendingQueue.sessions.map((s) => s.sessionId);
  if (sessionIds.length) {
    void runBatchSettlement(sessionIds);
  }
});
settleAllButton.addEventListener("click", () => {
  const sessionIds = pendingQueue.sessions.map((s) => s.sessionId);
  void runBatchSettlement(sessionIds);
});
autoSettleEnabled.addEventListener("change", saveAutoSettleSettings);
autoSettleThreshold.addEventListener("change", saveAutoSettleSettings);
sessionButton.addEventListener("click", startSession);
stopSessionButton.addEventListener("click", endSession);
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
  loadAutoSettleSettings();
  watchWalletState();
  watchSessionState();
  restoreState(relayNodes);
  void loadPendingQueue();
});
