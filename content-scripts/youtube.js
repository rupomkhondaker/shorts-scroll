// YouTube Auto Scroll Content Script
(function() {
  let autoScrollInterval = null;
  let videoEndDetectionInterval = null;
  let manualScrollTimeout = null;
  const platform = 'youtube';
  let settings = {
    detectVideoEnd: true,
    scrollAfterSeconds: 0,
    scrollInterval: 10
  };

  // Function to scroll to the next video
  function scrollToNextVideo() {
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

  // Function to detect when a YouTube video ends
  function setupVideoEndDetection() {
    if (videoEndDetectionInterval) {
      clearInterval(videoEndDetectionInterval);
    }

    videoEndDetectionInterval = setInterval(() => {
      // Only run detection if enabled in settings
      if (!settings.detectVideoEnd) return;

      // Get the video element
      const videoElement = document.querySelector('video');
      if (videoElement) {
        // Check if video has ended or is very close to ending (within 1 second)
        if (videoElement.ended || (videoElement.currentTime > 0 && 
            videoElement.duration > 0 && 
            videoElement.currentTime >= videoElement.duration - 1)) {
          
          console.log('YouTube video end detected, scrolling to next video');
          scrollToNextVideo();
        }
      }
    }, 1000); // Check every second
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
