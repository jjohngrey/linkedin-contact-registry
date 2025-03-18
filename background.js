// Store the profile data temporarily
let cachedProfileData = null

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "storeProfileData") {
    cachedProfileData = message.profileData
  }

  // Return true to indicate we'll respond asynchronously
  return true
})

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("LinkedIn to Google Sheets extension installed")
})

