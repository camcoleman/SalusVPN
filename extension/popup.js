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

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
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
  const quality = node.trafficQualityScore >= 90 ? "excellent traffic quality" : "good traffic quality";
  hints.push(quality);
  return `Recommended because it has ${hints.join(", ")}.";
}

function updateRecommendation(node) {
  recommendedBadge.textContent = node.verified ? "Best Overall" : "High Trust";
  recommendedNode.textContent = node.name;
  recommendedScore.textContent = `${node.trustScore}`;
  recommendedLatency.textContent = `${node.latency} ms`;
  recommendedReason.textContent = buildReason(node);
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
  sessionNode.textContent = node.name;
  sessionCost.textContent = formatCurrency(node.pricePerSession);
  chrome.storage.local.set({ selectedRelay: node.id });
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
  } catch (error) {
    walletStatus.textContent = "Connection cancelled or failed.";
  }
}

walletButton.addEventListener("click", toggleWallet);

function restoreSelectedNode(nodes) {
  chrome.storage.local.get(["selectedRelay"], (result) => {
    const selected = nodes.find((node) => node.id === result.selectedRelay);
    if (selected) {
      sessionNode.textContent = selected.name;
      sessionCost.textContent = formatCurrency(selected.pricePerSession);
    }
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
