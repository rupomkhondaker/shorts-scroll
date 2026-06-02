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

  // Function to scroll to the next video
  function scrollToNextVideo() {
    const now = Date.now();
    if (now - lastScrollTime < SCROLL_COOLDOWN) {
      console.log('Scroll cooldown active, skipping');
      return;
    }
    lastScrollTime = now;
    console.log('Scrolling to next YouTube video');
    
    // Check if we're on YouTube Shorts
    if (window.location.pathname.includes('/shorts')) {
      // For YouTube Shorts, we need to simulate a keyboard down arrow press
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        code: 'ArrowDown',
        keyCode: 40,
        which: 40,
        bubbles: true
      });
      document.dispatchEvent(keyEvent);
    } else {
      // For regular YouTube videos, find the next video in recommendations
      const nextVideoElements = document.querySelectorAll('ytd-compact-video-renderer, ytd-video-renderer');
      if (nextVideoElements.length > 0) {
        // Find the first visible recommendation that's not the current video
        for (let i = 0; i < nextVideoElements.length; i++) {
          const videoElement = nextVideoElements[i];
          if (isElementInViewport(videoElement)) {
            // Click on the video thumbnail
            const thumbnailElement = videoElement.querySelector('a#thumbnail');
            if (thumbnailElement) {
              thumbnailElement.click();
              return;
            }
          }
        }
        
        // If no visible recommendation found, scroll down to see more
        window.scrollBy(0, 500);
      }
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

  function onVideoEnded(event) {
    console.log('YouTube native video ended event fired');
    scrollToNextVideo();
  }

  function onTimeUpdate(event) {
    const video = event.target;
    const duration = video.duration;
    const currentTime = video.currentTime;

    // Detect near-end via timeupdate (fires much more often than polling)
    if (currentTime > 0 && typeof duration === 'number' && !isNaN(duration) && duration > 0 && duration !== Infinity) {
      if (currentTime >= duration - 1) {
        console.log('YouTube video near end detected via timeupdate');
        scrollToNextVideo();
        return;
      }
    }

    // Detect video replacement: was near end, now currentTime dropped significantly
    if (lastCurrentTime > 0 && lastDuration > 0 &&
        lastCurrentTime >= lastDuration - 2 &&
        currentTime < lastCurrentTime - 2) {
      console.log('YouTube video ended detected via currentTime reset');
      scrollToNextVideo();
      return;
    }

    lastCurrentTime = currentTime;
    lastDuration = duration;
  }

  function onPause(event) {
    const video = event.target;
    const duration = video.duration;
    const currentTime = video.currentTime;

    // YouTube often pauses at the end instead of firing ended
    if (currentTime > 0 && typeof duration === 'number' && !isNaN(duration) && duration > 0 && duration !== Infinity) {
      if (currentTime >= duration - 2) {
        console.log('YouTube video paused near end');
        scrollToNextVideo();
      }
    }
  }

  function attachVideoEndListeners() {
    const video = getMainVideoElement();
    if (!video || video === currentVideo) return;

    // Detach from previous video
    if (currentVideo) {
      currentVideo.removeEventListener('ended', onVideoEnded);
      currentVideo.removeEventListener('timeupdate', onTimeUpdate);
      currentVideo.removeEventListener('pause', onPause);
    }

    currentVideo = video;
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

    // Attach listeners to current video and watch for DOM changes
    attachVideoEndListeners();
    videoEndObserver = new MutationObserver(attachVideoEndListeners);
    videoEndObserver.observe(document.body, { childList: true, subtree: true });

    // Fast fallback polling to catch anything missed by events
    videoEndDetectionInterval = setInterval(() => {
      if (!settings.detectVideoEnd) return;

      const video = getMainVideoElement();
      if (!video) return;

      // Re-attach if video element changed (backup in case MutationObserver misses it)
      if (video !== currentVideo) {
        attachVideoEndListeners();
      }

      const duration = video.duration;
      const currentTime = video.currentTime;

      if (video.ended) {
        console.log('YouTube video ended (property, polled)');
        scrollToNextVideo();
        return;
      }

      if (currentTime > 0 && typeof duration === 'number' && !isNaN(duration) && duration > 0 && duration !== Infinity) {
        if (currentTime >= duration - 0.5) {
          console.log('YouTube video near end detected via fast polling');
          scrollToNextVideo();
        }
      }
    }, 200);
  }

  // Function to set up manual scroll after X seconds
  function setupManualScrollTimer() {
    if (manualScrollTimeout) {
      clearTimeout(manualScrollTimeout);
      manualScrollTimeout = null;
    }

    // Only set up if scrollAfterSeconds is greater than 0
    if (settings.scrollAfterSeconds > 0) {
      console.log(`Setting up manual scroll after ${settings.scrollAfterSeconds} seconds`);
      manualScrollTimeout = setTimeout(() => {
        scrollToNextVideo();
        // Reset the timer for the next video
        setupManualScrollTimer();
      }, settings.scrollAfterSeconds * 1000);
    }
  }

  // Start auto-scrolling with all options
  function startAutoScroll(options) {
    stopAutoScroll(); // Clear any existing timers
    
    // Update settings with provided options or defaults
    settings.detectVideoEnd = options.detectVideoEnd !== undefined ? options.detectVideoEnd : settings.detectVideoEnd;
    settings.scrollAfterSeconds = options.scrollAfterSeconds || settings.scrollAfterSeconds;
    
    // Only update interval if it's provided and video end detection is disabled
    if (!settings.detectVideoEnd && options.interval !== undefined) {
      settings.scrollInterval = options.interval;
    }
    
    console.log(`YouTube auto-scroll started with settings:`, settings);
    
    // Determine which scrolling method to use (priority: video end detection > manual timer > interval)
    let activeScrollMethod = 'none';
    
    // Set up video end detection if enabled (highest priority)
    if (settings.detectVideoEnd) {
      setupVideoEndDetection();
      activeScrollMethod = 'video-end';
      console.log('YouTube video end detection enabled');
    }
    // Set up manual scroll timer if specified and video end detection is not enabled
    else if (settings.scrollAfterSeconds > 0) {
      setupManualScrollTimer();
      activeScrollMethod = 'manual-timer';
      console.log(`YouTube manual scroll timer set to ${settings.scrollAfterSeconds} seconds`);
    }
    // Only use interval-based scrolling as last resort
    else {
      // Convert seconds to milliseconds
      const intervalMs = settings.scrollInterval * 1000;
      
      // Set new interval
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
