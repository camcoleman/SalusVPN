chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ selectedRelay: null }, () => {
    console.log("SalusVPN extension installed and storage initialized.");
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getSelectedRelay") {
    chrome.storage.local.get(["selectedRelay"], (result) => {
      sendResponse({ selectedRelay: result.selectedRelay ?? null });
    });
    return true;
  }
});
