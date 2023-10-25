function debounce(func, delay) {
  let debounceTimer;
  return function (...args) {
    const context = this;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ skippedCnt: 0, autoSkip: false }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error initializing data:", chrome.runtime.lastError);
      } else {
        console.log("Counter initialized to 0 and autoSkip set to false");
      }
    });
  }
});

function handleIncrementCounter(sendResponse) {
  chrome.storage.local.get(["skippedCnt"], (result) => {
    let count = result.skippedCnt + 1;
    chrome.storage.local.set({ skippedCnt: count }, () => {
      sendResponse(count);
    });
  });
}

const debouncedIncrementCounter = debounce(handleIncrementCounter, 300);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "incrementCounter") {
    debouncedIncrementCounter(sendResponse);
    return true; // Indicates you wish to send a response asynchronously
  } else if (message.action === "updateAutoToggle") {
    console.log("updateAutoToggle");
    console.log(message.autoSkip);
    chrome.storage.local.get(["autoSkip"], (result) => {
      chrome.storage.local.set({ autoSkip: message.autoSkip });
    });
    return true; // Indicates you wish to send a response asynchronously
  }
});
