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
