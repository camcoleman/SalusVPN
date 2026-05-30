const API_BASE = "http://localhost:3000";

const nodeList = document.getElementById("nodes-list");
const walletButton = document.getElementById("wallet-button");
const walletStatus = document.getElementById("wallet-status");
const recommendedBadge = document.getElementById("recommended-badge");
const recommendedNode = document.getElementById("recommended-node");
const recommendedScore = document.getElementById("recommended-score");
const recommendedLatency = document.getElementById("recommended-latency");
const recommendedReason = document.getElementById("recommended-reason");
const sessionNode = document.getElementById("session-node");
const sessionCost = document.getElementById("session-cost");
const sessionStatus = document.getElementById("session-status");
const sessionTime = document.getElementById("session-time");
const sessionMessage = document.getElementById("session-message");
const startSessionButton = document.getElementById("start-session-button");
const endSessionButton = document.getElementById("end-session-button");

let selectedNode = null;
let activeSessionId = null;
let elapsedSeconds = 0;
let sessionTimer = null;

function formatCurrency(value) {
  return `$${value.toFixed(4)}`;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function calculateBandwidth(seconds) {
  return seconds * 1.5;
}

function calculateCost(bandwidthMB, pricePerSession, seconds) {
  const baseCost = (pricePerSession * seconds) / 60;
  const bandwidthCost = (bandwidthMB / 100) * 0.01;
  return baseCost + bandwidthCost;
}

function getBestNode(nodes) {
  return nodes
    .slice()
    .sort((a, b) => {
      if (a.trustScore !== b.trustScore) return b.trustScore - a.trustScore;
      return a.latency - b.latency;
    })[0];
}

function buildReason(node) {
  const hints = [];
  if (node.verified) hints.push("recently verified");
  if (node.humanLaneAvailable) hints.push("human-verified lane available");
  if (node.latency < 30) hints.push("low latency");
  const quality =
    node.trafficQualityScore >= 90
      ? "excellent traffic quality"
      : "good traffic quality";
  hints.push(quality);
  return `Recommended because it has ${hints.join(", ")}.`;
}

function updateRecommendation(node) {
  recommendedBadge.textContent = node.verified ? "Best Overall" : "High Trust";
  recommendedNode.textContent = node.name;
  recommendedScore.textContent = `${node.trustScore}`;
  recommendedLatency.textContent = `${node.latency} ms`;
  recommendedReason.textContent = buildReason(node);
}

function updateSessionMetrics() {
  if (!selectedNode) return;
  const bandwidth = calculateBandwidth(elapsedSeconds);
  const cost = calculateCost(
    bandwidth,
    selectedNode.pricePerSession,
    elapsedSeconds
  );
  sessionTime.textContent = formatTime(elapsedSeconds);
  sessionCost.textContent = formatCurrency(cost);
  return { bandwidth, cost };
}

function renderNodeCard(node) {
  const card = document.createElement("article");
  card.className = "node-card";

  card.innerHTML = `
    <div>
      <h3>${node.name}</h3>
      <p class="muted-text">${node.region}</p>
    </div>
    <div class="node-meta">
      <span class="node-pill ${node.verified ? "green" : "red"}">${node.verified ? "Verified" : "Unverified"}</span>
      <span class="node-pill blue">${node.humanLaneAvailable ? "Human Lane" : "Standard"}</span>
      <span class="node-pill">Trust ${node.trustScore}</span>
    </div>
    <div class="node-actions">
      <button class="node-button" data-node-id="${node.id}">Select</button>
    </div>
  `;

  const button = card.querySelector("button");
  button.addEventListener("click", () => selectNode(node));
  return card;
}

function refreshNodeList(nodes) {
  nodeList.innerHTML = "";
  nodes.forEach((node) => nodeList.appendChild(renderNodeCard(node)));
}

function selectNode(node) {
  selectedNode = node;
  sessionNode.textContent = node.name;
  sessionCost.textContent = formatCurrency(node.pricePerSession);
  chrome.storage.local.set({ selectedRelay: node.id });
  sessionMessage.textContent = "";
}

async function updateWalletStatus() {
  const connected = await isWalletConnected();
  walletStatus.textContent = connected ? "Wallet connected" : "Wallet disconnected";
  walletButton.textContent = connected ? "Disconnect" : "Connect Wallet";
}

async function isWalletConnected() {
  if (!window.solana || !window.solana.isPhantom) return false;
  try {
    const response = await window.solana.connect({ onlyIfTrusted: true });
    return !!response?.publicKey;
  } catch {
    return false;
  }
}

async function toggleWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    walletStatus.textContent = "Phantom wallet not detected.";
    return;
  }

  try {
    if (walletButton.textContent === "Disconnect") {
      await window.solana.disconnect();
      walletStatus.textContent = "Wallet disconnected";
      walletButton.textContent = "Connect Wallet";
      return;
    }

    const response = await window.solana.connect();
    walletStatus.textContent = `Connected: ${response.publicKey.toString().slice(0, 8)}...`;
    walletButton.textContent = "Disconnect";
  } catch {
    walletStatus.textContent = "Connection cancelled or failed.";
  }
}

async function startSession() {
  if (!selectedNode) {
    sessionMessage.textContent = "Select a relay node first.";
    return;
  }

  if (activeSessionId) {
    sessionMessage.textContent = "Session already active.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedNodeId: selectedNode.id }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to start session");
    }

    const data = await response.json();
    activeSessionId = data.sessionId;
    elapsedSeconds = 0;
    sessionStatus.textContent = "Active";
    sessionMessage.textContent = "Session started via dashboard API.";

    if (sessionTimer) clearInterval(sessionTimer);
    sessionTimer = setInterval(() => {
      elapsedSeconds += 1;
      updateSessionMetrics();
    }, 1000);
  } catch (error) {
    sessionMessage.textContent =
      error instanceof Error ? error.message : "Failed to start session.";
  }
}

async function endSession() {
  if (!selectedNode || !activeSessionId) {
    sessionMessage.textContent = "No active session to end.";
    return;
  }

  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }

  const metrics = updateSessionMetrics();
  const bandwidth = metrics?.bandwidth ?? calculateBandwidth(elapsedSeconds);
  const cost =
    metrics?.cost ??
    calculateCost(bandwidth, selectedNode.pricePerSession, elapsedSeconds);

  try {
    const response = await fetch(`${API_BASE}/api/session/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: activeSessionId,
        selectedNodeId: selectedNode.id,
        bandwidthUsedMB: bandwidth,
        accruedCostUSDC: cost,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to end session");
    }

    sessionStatus.textContent = "Ended";
    sessionMessage.textContent =
      "Session ended. Settlement runs in the dashboard wallet flow.";
    activeSessionId = null;
  } catch (error) {
    sessionMessage.textContent =
      error instanceof Error ? error.message : "Failed to end session.";
  }
}

walletButton.addEventListener("click", toggleWallet);
startSessionButton.addEventListener("click", startSession);
endSessionButton.addEventListener("click", endSession);

function restoreSelectedNode(nodes) {
  chrome.storage.local.get(["selectedRelay"], (result) => {
    const node = nodes.find((entry) => entry.id === result.selectedRelay);
    if (node) selectNode(node);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  if (!Array.isArray(relayNodes)) return;
  const best = getBestNode(relayNodes);
  updateRecommendation(best);
  refreshNodeList(relayNodes);
  restoreSelectedNode(relayNodes);
  updateWalletStatus();
});
