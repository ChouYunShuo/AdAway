import { getActiveTabURL } from "./utils.js";

const createCntElement = (isActive = false) => {
  chrome.storage.local.get(["skippedCnt"], (data) => {
    const skippedCount = data.skippedCnt || 0;
    if (isActive) {
      const titleElement = document.querySelector(".title");
      titleElement.textContent = `You skipped ${skippedCount} youtube ads.`;
    } else {
      const container = document.querySelector(".container");
      container.innerHTML = `<div class="title">You skipped ${skippedCount} youtube ads.</div>`;
    }
  });
};

const createActivateButton = (container) => {
  const descriptionElement = document.createElement("span");
  descriptionElement.textContent = "Activate the auto skipper ";
  descriptionElement.className = "activate-desc";

  const labelElement = document.createElement("label");
  labelElement.className = "switch";

  const toggleElement = document.createElement("input");
  toggleElement.type = "checkbox";
  toggleElement.id = "autoSkipToggle";
  toggleElement.addEventListener("change", handleToggle.bind(this));

  const sliderElement = document.createElement("span");
  sliderElement.className = "slider round";

  container.appendChild(descriptionElement);
  container.appendChild(labelElement);
  labelElement.appendChild(toggleElement);
  labelElement.appendChild(sliderElement);
};

const handleToggle = async (e) => {
  const autoSkip = e.target.checked;
  chrome.runtime.sendMessage(
    {
      action: "updateAutoToggle",
      autoSkip: autoSkip,
    },
    function (response) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      } else {
        console.log(response.status);
      }
    }
  );

  const activeTab = await getActiveTabURL();
  if (activeTab.url.includes("youtube.com/watch")) {
    chrome.tabs.sendMessage(activeTab.id, {
      type: "checkAutoSkip",
      value: autoSkip,
    });
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector(".activate-btn-container");
  container.innerHTML = "";
  if (container) {
    createCntElement(true);
    createActivateButton(container);
    const toggle = document.getElementById("autoSkipToggle");
    chrome.storage.local.get(["autoSkip"], function (data) {
      toggle.checked = data.autoSkip;
    });
  }
});
