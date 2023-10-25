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

class YouTubeAdAway {
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

  /**
   * Checks for an ad overlay on the YouTube video and skips it if found.
   */
  checkForAdOverlay() {
    if (!this.youtubePlayer) {
      this.youtubePlayer = this.getYouTubePlayer();
    }
    const adOverlay = document.querySelector(".ytp-ad-player-overlay");
    const adSurvey = !!document.querySelector(".ytp-ad-survey");

    if (adOverlay || adSurvey) {
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
    }
  }

  /**
   * Callback for handling DOM mutations.
   * @param {MutationRecord[]} mutationsList - The list of DOM mutations
   */
  mutationCallback = (mutationsList) => {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList") {
        this.debouncedCheckForAdOverlay();
      }
    }
  };
  /**
   * Observes DOM changes to detect overlay ads.
   */
  ObserverOverlayAds() {
    const intervalId = setInterval(() => {
      const targetNode = document.querySelector(".video-ads");
      if (targetNode) {
        clearInterval(intervalId); // Clear the interval once the target node is found
        this.observer = new MutationObserver(this.mutationCallback);
        this.observer.observe(targetNode, this.config);
      }
    }, 200);
  }

  /**
   * Stops observing DOM changes.
   */
  stopObservingDOMChanges() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Sets the auto skip functionality based on the provided value.
   * @param {boolean} autoSkip - Determines if ads should be auto skipped
   */
  setAutoSkip(autoSkip) {
    if (autoSkip) {
      this.ObserverOverlayAds();
    } else {
      this.stopObservingDOMChanges();
    }
  }

  /**
   * Blocks static ads based on predefined selectors.
   */
  blockStaticAds() {
    staticAds.forEach((adSelector) => {
      const adElements = document.querySelectorAll(adSelector);
      adElements.forEach((adElement) => {
        adElement.style.display = "none";
      });
    });
  }

  /**
   * Set display to none to hide static Ads
   */
  hideElementsBySelector(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      element.style.display = "none";
    });
  }

  /**
   * Initializes keydown event listener to manually skip ads.
   */
  async initEvents() {
    document.addEventListener("keydown", (event) => {
      const isEditable =
        ["INPUT", "TEXTAREA"].includes(event.target.nodeName) ||
        event.target.isContentEditable;
      if (!isEditable && event.key === "q") {
        this.checkForAdOverlay();
      }
    });
  }

  /**
   * Initializes auto skip functionality based on stored settings.
   */
  async initAutoSkip() {
    chrome.storage.local.get(["autoSkip"], (data) => {
      this.setAutoSkip(data.autoSkip);
    });
  }

  /**
   * Initializes message listener for runtime communications.
   */
  async initMessaging() {
    chrome.runtime.onMessage.addListener((obj, sender, response) => {
      const { type, value } = obj;
      if (type === "checkAutoSkip") {
        this.setAutoSkip(value);
      }
    });
  }

  /**
   * Initializes the YouTube Ads Skipper.
   */
  async initialize() {
    await this.initEvents();
    await this.initMessaging();
    await this.initAutoSkip();
    this.youtubePlayer = this.getYouTubePlayer();

    setTimeout(this.blockStaticAds, 1000);
    setInterval(this.blockStaticAds, 5000);
    this.ObserverOverlayAds();
  }
}

// Creating an instance of YouTubeAdAway to start the functionality
(() => new YouTubeAdAway())();
