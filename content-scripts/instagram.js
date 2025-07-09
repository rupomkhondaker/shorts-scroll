// Instagram Auto Scroll Content Script
(function() {
  let autoScrollInterval = null;
  let videoEndDetectionInterval = null;
  let manualScrollTimeout = null;
  const platform = 'instagram';
  let settings = {
    detectVideoEnd: true,
    scrollAfterSeconds: 0,
    scrollInterval: 5
  };

  // Function to scroll to the next video
  function scrollToNextVideo() {
    // Check if we're on Instagram Reels
    if (window.location.pathname.includes('/reels/')) {
      // For Instagram Reels, we need to find and click the next button or simulate a swipe down
      const nextButtons = document.querySelectorAll('button[aria-label="Next"]');
      if (nextButtons.length > 0) {
        nextButtons[0].click();
      } else {
        // If no next button, simulate a swipe down (for mobile view in desktop)
        simulateSwipeDown();
      }
    } else if (window.location.pathname.includes('/stories/')) {
      // For Instagram Stories, click the next button
      const nextButtons = document.querySelectorAll('button[aria-label="Next"]');
      if (nextButtons.length > 0) {
        nextButtons[0].click();
      }
    } else {
      // For regular Instagram feed, just scroll down
      window.scrollBy(0, window.innerHeight * 0.8);
      
      // Try to find and click "Load more" buttons if they exist
      const loadMoreButtons = document.querySelectorAll('button:not([aria-label]):not([type]):not([role])');
      for (const button of loadMoreButtons) {
        if (button.textContent.toLowerCase().includes('load more') && isElementInViewport(button)) {
          button.click();
          break;
        }
      }
    }
  }

  // Helper function to simulate a swipe down gesture (for Reels)
  function simulateSwipeDown() {
    const centerX = window.innerWidth / 2;
    const startY = window.innerHeight / 3;
    const endY = window.innerHeight * 2 / 3;
    
    // Create touch events
    const touchStartEvent = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      view: window,
      touches: [
        new Touch({
          identifier: Date.now(),
          target: document.body,
          clientX: centerX,
          clientY: startY,
          pageX: centerX,
          pageY: startY
        })
      ]
    });
    
    const touchMoveEvent = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      view: window,
      touches: [
        new Touch({
          identifier: Date.now(),
          target: document.body,
          clientX: centerX,
          clientY: endY,
          pageX: centerX,
          pageY: endY
        })
      ]
    });
    
    const touchEndEvent = new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      view: window,
      touches: []
    });
    
    // Dispatch events
    document.body.dispatchEvent(touchStartEvent);
    setTimeout(() => {
      document.body.dispatchEvent(touchMoveEvent);
      setTimeout(() => {
        document.body.dispatchEvent(touchEndEvent);
      }, 50);
    }, 50);
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

  // Function to detect when an Instagram video ends
  function setupVideoEndDetection() {
    if (videoEndDetectionInterval) {
      clearInterval(videoEndDetectionInterval);
    }

    videoEndDetectionInterval = setInterval(() => {
      // Only run detection if enabled in settings
      if (!settings.detectVideoEnd) return;

      // Get video elements
      const videoElements = document.querySelectorAll('video');
      if (videoElements.length > 0) {
        // Check each video to see if any have ended
        for (const videoElement of videoElements) {
          if (isElementInViewport(videoElement) && 
              (videoElement.ended || (videoElement.currentTime > 0 && 
               videoElement.duration > 0 && 
               videoElement.currentTime >= videoElement.duration - 0.5))) {
            
            console.log('Instagram video end detected, scrolling to next video');
            scrollToNextVideo();
            break;
          }
        }
      }
    }, 500); // Check every half second
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
    
    console.log(`Instagram auto-scroll started with settings:`, settings);
    
    // Determine which scrolling method to use (priority: video end detection > manual timer > interval)
    let activeScrollMethod = 'none';
    
    // Set up video end detection if enabled (highest priority)
    if (settings.detectVideoEnd) {
      setupVideoEndDetection();
      activeScrollMethod = 'video-end';
      console.log('Instagram video end detection enabled');
    }
    // Set up manual scroll timer if specified and video end detection is not enabled
    else if (settings.scrollAfterSeconds > 0) {
      setupManualScrollTimer();
      activeScrollMethod = 'manual-timer';
      console.log(`Instagram manual scroll timer set to ${settings.scrollAfterSeconds} seconds`);
    }
    // Only use interval-based scrolling as last resort
    else {
      // Convert seconds to milliseconds
      const intervalMs = settings.scrollInterval * 1000;
      
      // Set new interval
      autoScrollInterval = setInterval(scrollToNextVideo, intervalMs);
      activeScrollMethod = 'interval';
      console.log(`Instagram interval-based auto-scroll started: ${settings.scrollInterval} seconds`);
    }
    
    console.log(`Instagram active scroll method: ${activeScrollMethod}`);
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
    
    console.log('Instagram auto-scroll stopped');
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
        interval: parseInt(data[`${platform}-interval`], 10) || 5,
        detectVideoEnd: data[`${platform}-detect-video-end`] !== false,
        scrollAfterSeconds: parseInt(data[`${platform}-scroll-after-seconds`], 10) || 0
      });
    }
  });
})();
