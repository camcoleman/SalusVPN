const hud = document.getElementById("hud");
const hudRelay = document.getElementById("hud-relay");
const hudTime = document.getElementById("hud-time");
const hudCost = document.getElementById("hud-cost");
const hudTrust = document.getElementById("hud-trust");
const hudLatency = document.getElementById("hud-latency");
const hudHint = document.getElementById("hud-hint");
const hudMinimize = document.getElementById("hud-minimize");

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatCurrency(value) {
  return `$${value.toFixed(4)}`;
}

function getTrustClass(score) {
  if (score >= 90) return "trust-green";
  if (score >= 70) return "trust-yellow";
  return "trust-red";
}

function renderHud(result) {
  const active = Boolean(result.sessionActive);
  const hudData = result.sessionHud ?? {};
  const seconds = result.sessionSeconds ?? 0;
  const pendingCount = result.pendingSettlementCount ?? 0;
  const pendingTotal = result.pendingSettlementTotalUSDC ?? 0;

  hud.classList.toggle("hud--active", active);
  hud.classList.toggle("hud--idle", !active);

  if (active && hudData.relayName) {
    hudRelay.textContent = hudData.relayName;
    hudTime.textContent = formatDuration(seconds);

    const metrics = getSessionMetrics(seconds, hudData.pricePerSession ?? 0);
    hudCost.textContent = formatCurrency(metrics.accruedCostUSDC);

    hudTrust.textContent = hudData.trustScore ?? "—";
    hudTrust.className = `hud-val ${getTrustClass(hudData.trustScore ?? 0)}`;

    hudLatency.textContent =
      hudData.latency != null ? `${hudData.latency}ms` : "—";
    hudHint.textContent = "Session live — browse freely, stats stay pinned here.";
  } else if (pendingCount > 0) {
    hudRelay.textContent = "Pending payments";
    hudTime.textContent = `${pendingCount}`;
    hudCost.textContent = formatCurrency(pendingTotal);
    hudTrust.textContent = "—";
    hudTrust.className = "hud-val";
    hudLatency.textContent = "—";
    hudHint.textContent = `${formatCurrency(pendingTotal)} owed · open popup to settle batch`;
  } else {
    hudRelay.textContent = "No active session";
    hudTime.textContent = "00:00";
    hudCost.textContent = "$0.0000";
    hudTrust.textContent = "—";
    hudTrust.className = "hud-val";
    hudLatency.textContent = "—";
    hudHint.textContent = "Start a session from the SalusVPN popup.";
  }
}

function loadHudState() {
  chrome.storage.local.get(
    [
      "sessionActive",
      "sessionSeconds",
      "sessionHud",
      "hudMinimized",
      "pendingSettlementCount",
      "pendingSettlementTotalUSDC",
    ],
    (result) => {
      if (result.hudMinimized) {
        hud.classList.add("hud--minimized");
        hudMinimize.textContent = "+";
        hudMinimize.title = "Expand";
      }
      renderHud(result);
    }
  );
}

hudMinimize.addEventListener("click", () => {
  const minimized = hud.classList.toggle("hud--minimized");
  hudMinimize.textContent = minimized ? "+" : "−";
  hudMinimize.title = minimized ? "Expand" : "Minimize";
  chrome.storage.local.set({ hudMinimized: minimized });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (
    changes.sessionActive ||
    changes.sessionSeconds ||
    changes.sessionHud ||
    changes.pendingSettlementCount ||
    changes.pendingSettlementTotalUSDC
  ) {
    loadHudState();
  }
});

loadHudState();
