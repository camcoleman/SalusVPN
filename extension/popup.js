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
const connectPill = document.getElementById("connect-pill");
const statusText = document.getElementById("status-text");
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
const liveCostRate = 0.0002;

const regionEmoji = {
  "US East": "🇺🇸",
  "US West": "🇺🇸",
  "EU West": "🇪🇺",
  "EU Central": "🇩🇪",
  APAC: "🌏",
};

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
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

function buildReason(node) {
  const parts = [];
  if (node.verified) parts.push(`verified ${formatAge(node.lastVerified)}`);
  if (node.humanLaneAvailable) parts.push("human lane");
  if (node.latency < 30) parts.push("low latency");
  parts.push(node.trafficQualityScore >= 90 ? "excellent traffic quality" : "good traffic quality");
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
    heroTrust.textContent = "--";
    heroTrust.className = "metric-val";
    heroLatency.textContent = "--";
    sessionBotRisk.textContent = "--";
    sessionHumanLane.textContent = "--";
    selectedDetails.textContent = "Select a relay to view verification details.";
    return;
  }

  heroTrust.textContent = `${selectedRelay.trustScore}`;
  heroTrust.className = `metric-val ${getTrustClass(selectedRelay.trustScore)}`;
  heroLatency.textContent = `${selectedRelay.latency}ms`;
  sessionBotRisk.textContent = `${selectedRelay.botRiskScore}%`;
  sessionHumanLane.textContent = selectedRelay.humanLaneAvailable ? "Available" : "Unavailable";
  selectedDetails.textContent = `${selectedRelay.name} · Verified ${formatAge(selectedRelay.lastVerified)} · Hash ${formatShortHash(selectedRelay.attestationHash)} · ${selectedRelay.humanLaneAvailable ? "Human lane" : "Standard lane"} · Bot risk ${selectedRelay.botRiskScore}%`;
}

function updateConnectionUI() {
  statusText.textContent = sessionActive ? "Connected" : "Disconnected";
  connectPill.classList.toggle("connected", sessionActive);
  connectPill.classList.toggle("disconnected", !sessionActive);
  sessionButton.textContent = sessionActive ? "Pause" : "Start";
  endSessionButton.disabled = !sessionActive;
}

function updateTimer() {
  sessionTimer.textContent = formatDuration(sessionSeconds);
  const liveCost = selectedRelay ? sessionSeconds * liveCostRate : 0;
  sessionLiveCost.textContent = formatCurrency(liveCost);
  footerCost.textContent = formatCurrency(liveCost);
  chrome.storage.local.set({ sessionSeconds });
}

function startSession() {
  if (!selectedRelay) return;

  sessionActive = true;
  chrome.storage.local.set({ sessionActive: true });
  updateConnectionUI();
  updateTimer();

  if (sessionInterval) clearInterval(sessionInterval);
  sessionInterval = setInterval(() => {
    sessionSeconds += 1;
    updateTimer();
  }, 1000);
}

function stopSession(reset = false) {
  sessionActive = false;
  chrome.storage.local.set({ sessionActive: false });
  updateConnectionUI();

  if (sessionInterval) {
    clearInterval(sessionInterval);
    sessionInterval = null;
  }

  if (reset) {
    sessionSeconds = 0;
    updateTimer();
  }
}

function setSelectedNode(node, persist = true) {
  selectedRelay = node;
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

async function isWalletConnected() {
  if (!window.solana || !window.solana.isPhantom) return false;
  try {
    const response = await window.solana.connect({ onlyIfTrusted: true });
    return !!response?.publicKey;
  } catch {
    return false;
  }
}

async function updateWalletStatus() {
  const connected = await isWalletConnected();
  walletStatus.textContent = connected ? "Connected" : "Disconnected";
  walletButton.textContent = connected ? "Disconnect" : "Connect";
}

async function toggleWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    walletStatus.textContent = "Phantom not detected";
    return;
  }

  try {
    if (walletButton.textContent === "Disconnect") {
      await window.solana.disconnect();
      walletStatus.textContent = "Disconnected";
      walletButton.textContent = "Connect";
      return;
    }

    const response = await window.solana.connect();
    walletStatus.textContent = `${response.publicKey.toString().slice(0, 8)}…`;
    walletButton.textContent = "Disconnect";
  } catch {
    walletStatus.textContent = "Connection failed";
  }
}

function restoreState(nodes) {
  chrome.storage.local.get(["selectedRelay", "sessionActive", "sessionSeconds"], (result) => {
    if (result.selectedRelay) {
      const selected = nodes.find((node) => node.id === result.selectedRelay);
      if (selected) setSelectedNode(selected, false);
    }

    sessionActive = result.sessionActive || false;
    sessionSeconds = result.sessionSeconds || 0;
    updateConnectionUI();

    if (sessionActive) startSession();
    else updateTimer();
  });
}

walletButton.addEventListener("click", toggleWallet);
sessionButton.addEventListener("click", () => {
  if (sessionActive) stopSession(false);
  else startSession();
});
useRecommendationBtn.addEventListener("click", () => setSelectedNode(getBestNode(relayNodes)));
endSessionButton.addEventListener("click", () => stopSession(true));

window.addEventListener("DOMContentLoaded", () => {
  if (!Array.isArray(relayNodes)) return;
  const best = getBestNode(relayNodes);
  updateRecommendation(best);
  refreshNodeList(relayNodes);
  restoreState(relayNodes);
  updateWalletStatus();
});
