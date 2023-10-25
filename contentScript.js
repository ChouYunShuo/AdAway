class YouTubeAdsSkipper {
  constructor() {
    this.observer = null;
    this.youtubePlayer = null;
    this.initialize();
  }

  getYouTubePlayer() {
    return document.querySelector(".video-stream");
  }

  checkForAdOverlay() {
    const adOverlay = document.querySelector(".ytp-ad-player-overlay");
    const adSurvey = document.querySelector(".ytp-ad-survey")?.length > 0;

    if (adOverlay) {
      if (!this.youtubePlayer) {
        this.youtubePlayer = this.getYouTubePlayer();
      }
      this.youtubePlayer.currentTime = this.youtubePlayer.duration - 0.1;
      this.youtubePlayer.paused && this.youtubePlayer.play();
      document.querySelector(".ytp-ad-skip-button")?.click();

      chrome.runtime.sendMessage(
        { action: "incrementCounter" },
        (updatedCount) => {
          console.log(`Skipped Ad count updated to ${updatedCount}`);
        }
      );
    } else if (adSurvey) {
      document.querySelector(".ytp-ad-skip-button")?.click();

      chrome.runtime.sendMessage(
        { action: "incrementCounter" },
        (updatedCount) => {
          console.log(`Skipped Ad count updated to ${updatedCount}`);
        }
      );
    }
  }

  observeDOMChanges() {
    this.observer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (mutation.type === "childList") {
          this.checkForAdOverlay();
        }
      }
    });

    const config = { attributes: true, childList: true, subtree: true };
    this.observer.observe(document, config);
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
      this.observeDOMChanges();
    } else {
      this.stopObservingDOMChanges();
    }
  }

  initEvents() {
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

  initMessaging() {
    chrome.runtime.onMessage.addListener((obj, sender, response) => {
      const { type, value } = obj;
      console.log(value);
      if (type === "checkAutoSkip") {
        this.setAutoSkip(value);
      }
    });
  }

  initialize() {
    this.initEvents();
    this.initMessaging();
    chrome.storage.local.get(["autoSkip"], (data) => {
      this.setAutoSkip(data.autoSkip);
    });
  }
}

(() => new YouTubeAdsSkipper())();
