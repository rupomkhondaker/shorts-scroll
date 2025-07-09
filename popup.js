document.addEventListener('DOMContentLoaded', function() {
  // Get all toggle and interval elements
  const platforms = ['youtube', 'instagram', 'facebook', 'tiktok'];
  
  // Load saved settings
  chrome.storage.sync.get(null, function(data) {
    platforms.forEach(platform => {
      const toggleId = `${platform}-toggle`;
      const intervalId = `${platform}-interval`;
      const detectVideoEndId = `${platform}-detect-video-end`;
      const scrollAfterSecondsId = `${platform}-scroll-after-seconds`;
      
      // Set toggle state
      const toggle = document.getElementById(toggleId);
      toggle.checked = data[toggleId] === true;
      
      // Set interval value
      const interval = document.getElementById(intervalId);
      if (data[intervalId]) {
        interval.value = data[intervalId];
      }
      
      // Set detect video end checkbox
      const detectVideoEnd = document.getElementById(detectVideoEndId);
      detectVideoEnd.checked = data[detectVideoEndId] !== false; // Default to true if not set
      
      // Set scroll after seconds value
      const scrollAfterSeconds = document.getElementById(scrollAfterSecondsId);
      if (data[scrollAfterSecondsId] !== undefined) {
        scrollAfterSeconds.value = data[scrollAfterSecondsId];
      }
      
      // Function to update UI based on settings
      function updateUIState() {
        // If detect video end is checked, disable interval
        interval.disabled = detectVideoEnd.checked;
        interval.parentElement.style.opacity = detectVideoEnd.checked ? '0.5' : '1';
        
        // If both detect video end and scroll after seconds are disabled, ensure interval is enabled
        if (!detectVideoEnd.checked && parseInt(scrollAfterSeconds.value, 10) <= 0) {
          interval.disabled = false;
          interval.parentElement.style.opacity = '1';
        }
      }
      
      // Initial UI update
      updateUIState();
      
      // Add event listeners
      toggle.addEventListener('change', function() {
        saveSettings(toggleId, toggle.checked);
        
        // Send message to content script
        sendSettingsUpdate(platform, toggle.checked ? 'start' : 'stop');
      });
      
      interval.addEventListener('change', function() {
        saveSettings(intervalId, parseInt(interval.value, 10));
        
        // Only send update if toggle is on
        if (toggle.checked) {
          sendSettingsUpdate(platform, 'update');
        }
      });
      
      detectVideoEnd.addEventListener('change', function() {
        saveSettings(detectVideoEndId, detectVideoEnd.checked);
        
        // Update UI state when this option changes
        updateUIState();
        
        // Only send update if toggle is on
        if (toggle.checked) {
          sendSettingsUpdate(platform, 'update');
        }
      });
      
      scrollAfterSeconds.addEventListener('change', function() {
        saveSettings(scrollAfterSecondsId, parseInt(scrollAfterSeconds.value, 10));
        
        // Update UI state when this option changes
        updateUIState();
        
        // Only send update if toggle is on
        if (toggle.checked) {
          sendSettingsUpdate(platform, 'update');
        }
      });
    });
  });
  
  // Function to send settings update to content script
  function sendSettingsUpdate(platform, action) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        const intervalId = `${platform}-interval`;
        const detectVideoEndId = `${platform}-detect-video-end`;
        const scrollAfterSecondsId = `${platform}-scroll-after-seconds`;
        
        // Get current settings
        const detectVideoEnd = document.getElementById(detectVideoEndId).checked;
        const scrollAfterSeconds = parseInt(document.getElementById(scrollAfterSecondsId).value, 10);
        
        // Create message object
        const message = {
          platform: platform,
          action: action,
          detectVideoEnd: detectVideoEnd,
          scrollAfterSeconds: scrollAfterSeconds
        };
        
        // Only include interval if video end detection is disabled
        if (!detectVideoEnd) {
          message.interval = parseInt(document.getElementById(intervalId).value, 10);
        }
        
        // Log what's being sent
        console.log(`Sending settings to ${platform}:`, message);
        
        // Send message to content script
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }
  
  function saveSettings(key, value) {
    const data = {};
    data[key] = value;
    chrome.storage.sync.set(data);
  }
});
