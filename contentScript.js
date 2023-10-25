function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// referenced from https://github.com/0x48piraj/fadblock/blob/master/src/chrome/js/content.js to block static ads
const staticAds = [
  ".ytd-companion-slot-renderer",
  ".ytd-action-companion-ad-renderer",
  ".ytd-watch-next-secondary-results-renderer.sparkles-light-cta",
  ".ytd-unlimited-offer-module-renderer",
  ".ytp-ad-overlay-image",
  ".ytp-ad-text-overlay",
  ".ytd-display-ad-renderer",
  ".ytd-statement-banner-renderer",
  ".ytd-in-feed-ad-layout-renderer",
  ".ytd-banner-promo-renderer",
  ".ytd-video-masthead-ad-v3-renderer",
  ".ytd-primetime-promo-renderer",
  "ytd-merch-shelf-renderer",
  "ytd-tvfilm-offer-module-renderer",
  "yt-mealbar-promo-renderer",
];

class YouTubeAdsSkipper {
  constructor() {
    this.observer = null;
    this.youtubePlayer = null;
    this.config = { childList: true, subtree: true };
    this.initialize();
  }
  debouncedCheckForAdOverlay = debounce(() => this.checkForAdOverlay(), 200);

  getYouTubePlayer() {
    return document.querySelector(".video-stream");
  }

  checkForAdOverlay() {
    const adOverlay = document.querySelector(".ytp-ad-player-overlay");
    const adSurvey = document.querySelector(".ytp-ad-survey")?.length > 0;
    if (!this.youtubePlayer) {
      this.youtubePlayer = this.getYouTubePlayer();
    }
    if (adOverlay) {
      this.youtubePlayer.currentTime = this.youtubePlayer.duration - 0.1;
      this.youtubePlayer.paused && this.youtubePlayer.play();
      document
        .querySelectorAll('[class*="ytp-ad-skip-button"]')
        .forEach((button) => button.click());

      chrome.runtime.sendMessage(
        { action: "incrementCounter" },
        (updatedCount) => {
          console.log(`Skipped Ad count updated to ${updatedCount}`);
        }
      );
    } else if (adSurvey) {
      document
        .querySelectorAll('[class*="ytp-ad-skip-button"]')
        .forEach((button) => button.click());

      chrome.runtime.sendMessage(
        { action: "incrementCounter" },
        (updatedCount) => {
          console.log(`Skipped Ad count updated to ${updatedCount}`);
        }
      );
    }
  }

  mutationCallback = (mutationsList) => {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList") {
        this.debouncedCheckForAdOverlay();
      }
    }
  };

  ObserverOverlayAds() {
    const intervalId = setInterval(() => {
      const targetNode = document.querySelector(".video-ads");
      if (targetNode) {
        clearInterval(intervalId); // Clear the interval once the target node is found
        this.observer = new MutationObserver(this.mutationCallback);
        this.observer.observe(targetNode, this.config);
      }
    }, 1000);
  }

  stopObservingDOMChanges() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  setAutoSkip(autoSkip) {
    if (autoSkip) {
      this.checkForAdOverlay();
      this.ObserverOverlayAds();
    } else {
      this.stopObservingDOMChanges();
    }
  }

  blockStatic() {
    console.log("blockStatic");
    setTimeout(() => {
      staticAds.forEach((ad) => {
        this.hideElementsBySelector(ad);
      });
    }, 0);
  }

  hideElementsBySelector(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      element.style.display = "none";
    });
  }

  async initEvents() {
    document.addEventListener("keydown", (event) => {
      if (
        event.target.nodeName === "INPUT" ||
        event.target.nodeName === "TEXTAREA" ||
        event.target.isContentEditable
      ) {
        return false;
      }
      if (event.key === "q") {
        this.checkForAdOverlay(); // skip ads
      }
    });
  }
  async initAutoSkip() {
    chrome.storage.local.get(["autoSkip"], (data) => {
      this.setAutoSkip(data.autoSkip);
    });
  }
  async initMessaging() {
    chrome.runtime.onMessage.addListener((obj, sender, response) => {
      const { type, value } = obj;
      if (type === "checkAutoSkip") {
        this.setAutoSkip(value);
      }
    });
  }

  async initialize() {
    await this.initEvents();
    await this.initMessaging();
    await this.initAutoSkip();
    this.youtubePlayer = this.getYouTubePlayer();
    this.observer = new MutationObserver(this.mutationCallback);

    setTimeout(() => {
      this.blockStatic();

      setInterval(() => {
        this.blockStatic();
      }, 5000);
    }, 1000);
  }
}

(() => new YouTubeAdsSkipper())();
