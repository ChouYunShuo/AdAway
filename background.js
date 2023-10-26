/**
 * Debounce function to limit the rate at which a function can be invoked.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
function debounce(func, delay) {
  let debounceTimer;
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Event listener for the chrome extension's installation event.
 * It initializes storage with default values.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ skippedCnt: 0, autoSkip: true }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error initializing data:", chrome.runtime.lastError);
      } else {
        console.log("Counter initialized to 0 and autoSkip set to false");
      }
    });
  }
});

/**
 * Handles incrementing the counter in storage and sending the updated count as a response.
 * @param {Function} sendResponse - Function to send a response back to the message sender.
 */
function handleIncrementCounter(sendResponse) {
  chrome.storage.local.get(["skippedCnt"], (result) => {
    const updatedCount = (result.skippedCnt || 0) + 1;
    chrome.storage.local.set({ skippedCnt: updatedCount }, () => {
      sendResponse(updatedCount);
    });
  });
}

const debouncedIncrementCounter = debounce(handleIncrementCounter, 300);

/**
 * Chrome runtime message listener to handle messages from content scripts.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "incrementCounter") {
    debouncedIncrementCounter(sendResponse);
    return true; // Indicates an asynchronous response
  }

  if (message.action === "updateAutoToggle") {
    console.log("AutoSkip status:", message.autoSkip);
    chrome.storage.local.set({ autoSkip: message.autoSkip });
    // Assuming no response is needed for this message
  }
  sendResponse({ status: "Received" });
});
