(function mountSalusSessionHud() {
  if (window.__salusSessionHudMounted) return;
  window.__salusSessionHudMounted = true;

  const host = document.createElement("div");
  host.id = "salus-session-hud-host";
  host.setAttribute("data-salus-hud", "true");
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "closed" });
  let stopPending = false;

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function formatCurrency(value) {
    return `$${value.toFixed(4)}`;
  }

  function calculateBandwidth(elapsedSeconds) {
    return elapsedSeconds * 1.5;
  }

  function calculateCost(bandwidthMB, pricePerSession, elapsedSeconds) {
    const baseCost = (pricePerSession * elapsedSeconds) / 60;
    const bandwidthCost = (bandwidthMB / 100) * 0.01;
    return baseCost + bandwidthCost;
  }

  function getSessionMetrics(elapsedSeconds, pricePerSession) {
    const bandwidthMB = calculateBandwidth(elapsedSeconds);
    const accruedCostUSDC = calculateCost(
      bandwidthMB,
      pricePerSession,
      elapsedSeconds
    );
    return { bandwidthMB, accruedCostUSDC };
  }

  function render(state) {
    const active = Boolean(state.sessionActive);
    if (!active) {
      teardown();
      return;
    }

    const hudData = state.sessionHud ?? {};
    const seconds = state.sessionSeconds ?? 0;
    const metrics = getSessionMetrics(seconds, hudData.pricePerSession ?? 0);
    const latency =
      hudData.latency != null ? `${hudData.latency}ms` : "—";

    timeVal.textContent = formatDuration(seconds);
    costVal.textContent = formatCurrency(metrics.accruedCostUSDC);
    latencyVal.textContent = latency;
    stopBtn.disabled = stopPending;
  }

  function loadState() {
    chrome.storage.local.get(
      ["sessionActive", "sessionSeconds", "sessionHud"],
      (result) => {
        render(result);
      }
    );
  }

  function onStorageChanged(changes, area) {
    if (area !== "local") return;
    if (
      !changes.sessionActive &&
      !changes.sessionSeconds &&
      !changes.sessionHud
    ) {
      return;
    }

    chrome.storage.local.get(
      ["sessionActive", "sessionSeconds", "sessionHud"],
      (result) => {
        render(result);
      }
    );
  }

  function onStopClick() {
    if (stopPending) return;
    stopPending = true;
    stopBtn.disabled = true;
    chrome.runtime.sendMessage({ type: "STOP_FROM_HUD" }, () => {
      if (chrome.runtime.lastError) {
        stopPending = false;
        stopBtn.disabled = false;
      }
    });
  }

  function teardown() {
    chrome.storage.onChanged.removeListener(onStorageChanged);
    host.remove();
    window.__salusSessionHudMounted = false;
    delete window.__salusRemoveSessionHud;
  }

  window.__salusRemoveSessionHud = teardown;

  const style = document.createElement("style");
  shadow.appendChild(style);

  const bar = document.createElement("div");
  bar.className = "hud-bar";
  bar.innerHTML = `
    <span class="hud-dot" aria-hidden="true"></span>
    <div class="hud-stat">
      <span class="hud-lbl">Time</span>
      <span class="hud-val" data-field="time">00:00</span>
    </div>
    <span class="hud-sep" aria-hidden="true"></span>
    <div class="hud-stat">
      <span class="hud-lbl">Cost</span>
      <span class="hud-val" data-field="cost">$0.0000</span>
    </div>
    <span class="hud-sep" aria-hidden="true"></span>
    <div class="hud-stat">
      <span class="hud-lbl">Lat</span>
      <span class="hud-val" data-field="latency">—</span>
    </div>
    <button type="button" class="hud-stop">Stop</button>
  `;
  shadow.appendChild(bar);

  const timeVal = bar.querySelector('[data-field="time"]');
  const costVal = bar.querySelector('[data-field="cost"]');
  const latencyVal = bar.querySelector('[data-field="latency"]');
  const stopBtn = bar.querySelector(".hud-stop");

  stopBtn.addEventListener("click", onStopClick);
  chrome.storage.onChanged.addListener(onStorageChanged);

  fetch(chrome.runtime.getURL("session-hud.css"))
    .then((response) => response.text())
    .then((css) => {
      style.textContent = css;
    })
    .catch(() => {
      style.textContent = `
        .hud-bar { position: fixed; top: 12px; right: 12px; z-index: 2147483647; }
      `;
    })
    .finally(() => {
      loadState();
    });
})();
