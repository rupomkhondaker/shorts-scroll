# Shorts Scroll

A browser extension that automatically scrolls through videos on YouTube, Instagram, Facebook, and TikTok.

## Features

- Auto-scroll through videos on multiple platforms:
  - YouTube (regular videos and Shorts)
  - Instagram (feed, Reels, and Stories)
  - Facebook (feed, Watch, Reels, and Stories)
  - TikTok (For You page and video pages)
- Customizable scroll interval for each platform
- Simple and intuitive user interface
- Toggle auto-scrolling on/off for each platform independently

## Installation

### Chrome/Edge/Brave (Chromium-based browsers)

1. Download or clone this repository
2. Open your browser and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing this extension
5. The Shorts Scroll extension should now appear in your browser toolbar

### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Select any file in the extension folder (e.g., manifest.json)
5. The Shorts Scroll extension should now appear in your browser toolbar

## Usage

1. Click on the Shorts Scroll icon in your browser toolbar to open the extension popup
2. For each platform:
   - Toggle the switch to enable/disable auto-scrolling
   - Adjust the scroll interval (in seconds) to your preference
3. Navigate to any supported platform (YouTube, Instagram, Facebook, or TikTok)
4. The extension will automatically scroll through videos based on your settings

## Notes

- The extension will remember your settings between browser sessions
- Auto-scrolling will only activate on the supported platforms
- You can adjust settings while browsing, and changes will take effect immediately

## Customization

You can modify the extension to suit your needs:
- Edit the CSS in popup.html to change the appearance
- Modify the content scripts to change the scrolling behavior for each platform

## License

This project is open source and available for personal use.

## Disclaimer

This extension is not affiliated with or endorsed by YouTube, Instagram, Facebook, or TikTok. Use at your own risk and in accordance with each platform's terms of service.
