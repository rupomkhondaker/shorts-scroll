// YouTube Auto Scroll Content Script
(function() {
  let autoScrollInterval = null;
  let videoEndDetectionInterval = null;
  let manualScrollTimeout = null;
  let videoEndObserver = null;
  let lastScrollTime = 0;
  const SCROLL_COOLDOWN = 3000;
  const platform = 'youtube';
  let settings = {
    detectVideoEnd: true,
    scrollAfterSeconds: 0,
    scrollInterval: 10
  };

  let scrolledThisVideo = false;

  // Dispatch keyboard event on multiple targets for shadow DOM compatibility
  function dispatchArrowDown() {
    const options = {
      key: 'ArrowDown',
      code: 'ArrowDown',
      keyCode: 40,
      which: 40,
      bubbles: true,
      composed: true,
      cancelable: true
    };
    const targets = [
      document.activeElement,
      document.querySelector('ytd-shorts'),
      document.querySelector('#movie_player'),
      document.querySelector('video'),
      document.body,
      document,
      window
    ].filter(Boolean);
    targets.forEach(target => target.dispatchEvent(new KeyboardEvent('keydown', options)));
  }

  // Click the Shorts next button if it exists
  function clickShortsNextButton() {
    const selectors = [
      'ytd-shorts button[aria-label*="Next"]',
      'ytd-shorts [aria-label*="next"]',
      'ytd-shorts .navigation-button',
      'ytd-shorts #navigation-button-down',
      '[is-shorts] button[aria-label*="Next"]'
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        console.log('Shorts Scroll: clicking next button', sel);
        btn.click();
        return true;
      }
    }
    return false;
  }

  // Function to scroll to the next video
  function scrollToNextVideo() {
    if (scrolledThisVideo) {
      console.log('Already scrolled for this video, skipping');
      return;
    }

    const now = Date.now();
    if (now - lastScrollTime < SCROLL_COOLDOWN) {
      console.log('Scroll cooldown active, skipping');
      return;
    }

    scrolledThisVideo = true;
    lastScrollTime = now;
    console.log('Scrolling to next YouTube video');

    if (window.location.pathname.includes('/shorts')) {
      // Try next button first, then keyboard fallback
      if (!clickShortsNextButton()) {
        console.log('Shorts Scroll: next button not found, using ArrowDown keyboard event');
        dispatchArrowDown();
      }
    } else {
      // Try autoplay / up next button first
      const upNextSelectors = [
        '.ytp-autonav-toggle-button[aria-checked="true"]',
        'ytd-compact-autoplay-renderer a#thumbnail',
        'ytd-compact-video-renderer a#thumbnail',
        'ytd-video-renderer a#thumbnail',
        'ytd-playlist-panel-renderer ytd-playlist-panel-video-renderer a#wc-endpoint'
      ];
      for (const sel of upNextSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          console.log('Shorts Scroll: clicking next video element', sel);
          el.click();
          return;
        }
      }

      // Fallback: scroll recommendations into view
      const nextVideoElements = document.querySelectorAll('ytd-compact-video-renderer, ytd-video-renderer');
      if (nextVideoElements.length > 0) {
        for (let i = 0; i < nextVideoElements.length; i++) {
          const videoElement = nextVideoElements[i];
          if (isElementInViewport(videoElement)) {
            const thumbnailElement = videoElement.querySelector('a#thumbnail');
            if (thumbnailElement) {
              console.log('Shorts Scroll: clicking visible recommendation thumbnail');
              thumbnailElement.click();
              return;
            }
          }
        }
        window.scrollBy(0, 500);
      }
      console.log('Shorts Scroll: no next video element found for regular YouTube');
    }
  }

  // Helper function to check if element is visible in viewport
  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Helper to get the main video element reliably
  function getMainVideoElement() {
    return document.querySelector('#movie_player video') ||
           document.querySelector('ytd-player video') ||
           document.querySelector('ytd-shorts video') ||
           document.querySelector('video');
  }

  let currentVideo = null;
  let lastCurrentTime = 0;
  let lastDuration = 0;

  function onVideoEnded() {
    console.log('YouTube native video ended event fired');
    scrollToNextVideo();
  }

  function onTimeUpdate(event) {
    const video = event.target;
    const duration = video.duration;
    const currentTime = video.currentTime;

    // Detect video replacement: was near end, now currentTime dropped significantly
    // This means a new video loaded (YouTube Shorts often reuses the same element)
    if (
      lastCurrentTime > 0 &&
      lastDuration > 0 &&
      lastCurrentTime >= lastDuration - 2 &&
      currentTime < lastCurrentTime - 2
    ) {
      console.log('YouTube video swap detected via currentTime reset');
      scrolledThisVideo = false;
      lastCurrentTime = currentTime;
      lastDuration = duration;
      return;
    }

    // Detect near-end via timeupdate
    if (
      currentTime > 0 &&
      typeof duration === 'number' &&
      !isNaN(duration) &&
      duration > 0 &&
      duration !== Infinity
    ) {
      if (currentTime >= duration - 1) {
        console.log('YouTube video near end detected via timeupdate');
        scrollToNextVideo();
        return;
      }
    }

    lastCurrentTime = currentTime;
    lastDuration = duration;
  }

  function onPause(event) {
    const video = event.target;
    const duration = video.duration;
    const currentTime = video.currentTime;

    // YouTube often pauses at the end instead of firing ended
    if (
      currentTime > 0 &&
      typeof duration === 'number' &&
      !isNaN(duration) &&
      duration > 0 &&
      duration !== Infinity
    ) {
      if (currentTime >= duration - 3) {
        console.log('YouTube video paused near end');
        scrollToNextVideo();
      }
    }
  }

  function attachVideoEndListeners() {
    const video = getMainVideoElement();

    // Re-attach if video is new OR if currentVideo has been detached from the DOM
    if (!video) return;
    if (video === currentVideo && currentVideo.isConnected) return;

    // Detach from previous video
    if (currentVideo) {
      currentVideo.removeEventListener('ended', onVideoEnded);
      currentVideo.removeEventListener('timeupdate', onTimeUpdate);
      currentVideo.removeEventListener('pause', onPause);
    }

    currentVideo = video;
    scrolledThisVideo = false;
    lastCurrentTime = 0;
    lastDuration = video.duration || 0;

    video.addEventListener('ended', onVideoEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('pause', onPause);
    console.log('YouTube video end listeners attached to new video element');
  }

  // Function to detect when a YouTube video ends
  function setupVideoEndDetection() {
    if (videoEndDetectionInterval) {
      clearInterval(videoEndDetectionInterval);
      videoEndDetectionInterval = null;
    }
    if (videoEndObserver) {
      videoEndObserver.disconnect();
      videoEndObserver = null;
    }

    attachVideoEndListeners();

    // MutationObserver as a backup for DOM changes
    videoEndObserver = new MutationObserver(attachVideoEndListeners);
    videoEndObserver.observe(document.body, { childList: true, subtree: true });

    // Lightweight polling — catch video swaps missed by MutationObserver + paused+near-end fallback
    videoEndDetectionInterval = setInterval(() => {
      if (!settings.detectVideoEnd) return;

      const video = getMainVideoElement();
      if (!video) return;

      // Re-attach if video element swapped or detached
      if (video !== currentVideo || !currentVideo.isConnected) {
        attachVideoEndListeners();
        return;
      }

      // Fallback: video is paused very near the end (YouTube end screen)
      const duration = video.duration;
      const currentTime = video.currentTime;
      if (
        video.paused &&
        currentTime > 0 &&
        typeof duration === 'number' &&
        !isNaN(duration) &&
        duration > 0 &&
        duration !== Infinity &&
        currentTime >= duration - 3
      ) {
        console.log('YouTube video paused near end detected via polling');
        scrollToNextVideo();
      }
    }, 1000);
  }

  // Function to set up manual scroll after X seconds
  function setupManualScrollTimer() {
    if (manualScrollTimeout) {
      clearTimeout(manualScrollTimeout);
      manualScrollTimeout = null;
    }

    if (settings.scrollAfterSeconds > 0) {
      console.log(`Setting up manual scroll after ${settings.scrollAfterSeconds} seconds`);
      manualScrollTimeout = setTimeout(() => {
        scrollToNextVideo();
        setupManualScrollTimer();
      }, settings.scrollAfterSeconds * 1000);
    }
  }

  // Start auto-scrolling with all options
  function startAutoScroll(options) {
    stopAutoScroll();

    settings.detectVideoEnd = options.detectVideoEnd !== undefined ? options.detectVideoEnd : settings.detectVideoEnd;
    settings.scrollAfterSeconds = options.scrollAfterSeconds || settings.scrollAfterSeconds;

    if (!settings.detectVideoEnd && options.interval !== undefined) {
      settings.scrollInterval = options.interval;
    }

    console.log('YouTube auto-scroll started with settings:', settings);

    let activeScrollMethod = 'none';

    if (settings.detectVideoEnd) {
      setupVideoEndDetection();
      activeScrollMethod = 'video-end';
      console.log('YouTube video end detection enabled');
    } else if (settings.scrollAfterSeconds > 0) {
      setupManualScrollTimer();
      activeScrollMethod = 'manual-timer';
      console.log(`YouTube manual scroll timer set to ${settings.scrollAfterSeconds} seconds`);
    } else {
      const intervalMs = settings.scrollInterval * 1000;
      autoScrollInterval = setInterval(scrollToNextVideo, intervalMs);
      activeScrollMethod = 'interval';
      console.log(`YouTube interval-based auto-scroll started: ${settings.scrollInterval} seconds`);
    }

    console.log(`YouTube active scroll method: ${activeScrollMethod}`);
  }

  // Stop auto-scrolling
  function stopAutoScroll() {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }

    if (videoEndDetectionInterval) {
      clearInterval(videoEndDetectionInterval);
      videoEndDetectionInterval = null;
    }

    if (manualScrollTimeout) {
      clearTimeout(manualScrollTimeout);
      manualScrollTimeout = null;
    }

    if (videoEndObserver) {
      videoEndObserver.disconnect();
      videoEndObserver = null;
    }

    if (currentVideo) {
      currentVideo.removeEventListener('ended', onVideoEnded);
      currentVideo.removeEventListener('timeupdate', onTimeUpdate);
      currentVideo.removeEventListener('pause', onPause);
      currentVideo = null;
    }

    scrolledThisVideo = false;
    lastScrollTime = 0;
    lastCurrentTime = 0;
    lastDuration = 0;

    console.log('YouTube auto-scroll stopped');
  }

  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.platform === platform) {
      if (message.action === 'start') {
        startAutoScroll({
          interval: message.interval,
          detectVideoEnd: message.detectVideoEnd,
          scrollAfterSeconds: message.scrollAfterSeconds
        });
      } else if (message.action === 'stop') {
        stopAutoScroll();
      } else if (message.action === 'update') {
        startAutoScroll({
          interval: message.interval,
          detectVideoEnd: message.detectVideoEnd,
          scrollAfterSeconds: message.scrollAfterSeconds
        });
      }
    }
  });

  // Check if auto-scroll should be enabled on page load
  chrome.storage.sync.get([
    `${platform}-toggle`,
    `${platform}-interval`,
    `${platform}-detect-video-end`,
    `${platform}-scroll-after-seconds`
  ], function(data) {
    if (data[`${platform}-toggle`] === true) {
      startAutoScroll({
        interval: parseInt(data[`${platform}-interval`], 10) || 10,
        detectVideoEnd: data[`${platform}-detect-video-end`] !== false,
        scrollAfterSeconds: parseInt(data[`${platform}-scroll-after-seconds`], 10) || 0
      });
    }
  });
})();