// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(function() {
  const defaultSettings = {
    // YouTube settings
    'youtube-toggle': false,
    'youtube-interval': 10,
    'youtube-detect-video-end': true,
    'youtube-scroll-after-seconds': 0,
    
    // Instagram settings
    'instagram-toggle': false,
    'instagram-interval': 5,
    'instagram-detect-video-end': true,
    'instagram-scroll-after-seconds': 0,
    
    // Facebook settings
    'facebook-toggle': false,
    'facebook-interval': 8,
    'facebook-detect-video-end': true,
    'facebook-scroll-after-seconds': 0,
    
    // TikTok settings
    'tiktok-toggle': false,
    'tiktok-interval': 3,
    'tiktok-detect-video-end': true,
    'tiktok-scroll-after-seconds': 0
  };
  
  chrome.storage.sync.set(defaultSettings);
  console.log('Shorts Scroll extension installed with default settings');
});

// Listen for tab updates to initialize content scripts
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    const url = tab.url || '';
    
    // Check which platform the user is on
    let platform = null;
    if (url.includes('youtube.com')) {
      platform = 'youtube';
    } else if (url.includes('instagram.com')) {
      platform = 'instagram';
    } else if (url.includes('facebook.com')) {
      platform = 'facebook';
    } else if (url.includes('tiktok.com')) {
      platform = 'tiktok';
    }
    
    // If on a supported platform, check if auto-scroll is enabled
    if (platform) {
      chrome.storage.sync.get([
        `${platform}-toggle`, 
        `${platform}-interval`,
        `${platform}-detect-video-end`,
        `${platform}-scroll-after-seconds`
      ], function(data) {
        if (data[`${platform}-toggle`] === true) {
          // Send message to content script to start auto-scrolling with all settings
          chrome.tabs.sendMessage(tabId, {
            platform: platform,
            action: 'start',
            interval: parseInt(data[`${platform}-interval`], 10),
            detectVideoEnd: data[`${platform}-detect-video-end`] !== false, // Default to true if not set
            scrollAfterSeconds: parseInt(data[`${platform}-scroll-after-seconds`], 10) || 0
          });
        }
      });
    }
  }
});
