// This script runs when a user visits a LinkedIn profile page

// Declare chrome if it's not already defined (e.g., when testing outside of a Chrome extension)
if (typeof chrome === "undefined") {
  var chrome = {};
}

// Function to extract the full name from the LinkedIn profile
function extractLinkedInName() {
  // LinkedIn stores the name in an h1 element with a specific class
  // This selector might need to be updated if LinkedIn changes their DOM structure
  const nameElement = document.querySelector("h1.text-heading-xlarge");

  if (nameElement) {
    return nameElement.textContent.trim();
  } else {
    // Fallback selectors in case the primary one doesn't work
    const alternateSelectors = [
      "h1.inline.t-24.t-black.t-normal.break-words",
      "h1.text-heading-xlarge.inline.t-24.v-align-middle.break-words",
      "h1.inline",
    ];

    for (const selector of alternateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }

    return null;
  }
}

// Function to extract current role information
function extractCurrentRole() {
  // Try multiple selector patterns for current company
  const possibleSelectors = [
    // Look for the experience section with "present" indicator
    ".experience-section .pv-entity__position-group:first-child .pv-entity__company-summary-info span",

    // Current position in the profile header area
    ".pv-top-card-section__headline",

    // Newer LinkedIn UI patterns
    '[data-field="experience"] li:first-child .pv-entity__secondary-title',

    // Experience section with present date
    '.pv-position-entity:has(span:contains("present")) .pv-entity__company-summary-info h3',

    // Current company in the about section
    '.pv-about-section .pv-about__summary-text:contains("currently")',

    // Newer class patterns
    ".display-flex.align-items-center.mr1.t-bold span",

    // Most recent experience section
    ".pv-profile-section.experience-section ul.pv-profile-section__section-info > li:first-child .pv-entity__company-summary-info > span:nth-child(2)",
  ];

  for (const selector of possibleSelectors) {
    try {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    } catch (e) {
      // Some complex selectors might not be supported in all browsers
      continue;
    }
  }

  // Alternative approach: look for text patterns
  const experienceElements = document.querySelectorAll(
    '.experience-section li, [data-field="experience"] li'
  );
  for (const el of experienceElements) {
    const dateText = el.textContent;
    if (dateText.includes("Present") || dateText.includes("present")) {
      // Find the role name within this element
      const roleEl = el.querySelector(
        ".pv-entity__company-summary-info span, .pv-entity__secondary-title"
      );
      if (roleEl) {
        return roleEl.textContent.trim();
      }
    }
  }

  return null;
}

// Function to extract current company information
function extractCurrentCompany() {
  // Try multiple selector patterns for current company
  const possibleSelectors = [
    // Look for the experience section with "present" indicator
    ".artdeco-card pv-profile-card break-words mt2"
  ];

  for (const selector of possibleSelectors) {
    try {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    } catch (e) {
      // Some complex selectors might not be supported in all browsers
      continue;
    }
  }

  // Alternative approach: look for text patterns
  const experienceElements = document.querySelectorAll(
    '.experience-section li, [data-field="experience"] li'
  );
  for (const el of experienceElements) {
    // const dateText = el.textContent;
    // if (dateText.includes("Present") || dateText.includes("present")) {
    //   // Find the role name within this element
    const roleEl = el.querySelector(
      ".pv-entity__company-summary-info span, .pv-entity__secondary-title inline-show-more-text--is-collapsed-with-line-clamp"
    );
    if (roleEl) {
      return roleEl.textContent.trim();
    }
    // }
  }

  return null;
}

// Extract profile URL
function getProfileUrl() {
  return window.location.href.split("?")[0]; // Remove query parameters
}

// Function to send the extracted data to the popup when requested
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProfileData") {
    const profileData = {
      name: extractLinkedInName(),
      role: extractCurrentRole(),
      company: extractCurrentCompany(),
      profileUrl: getProfileUrl(),
      timestamp: new Date().toISOString(),
    };
    sendResponse(profileData);
  }
  return true; // Required for asynchronous response
});

// Automatically extract the data when the page loads
const profileData = {
  name: extractLinkedInName(),
  role: extractCurrentRole(),
  company: extractCurrentCompany(),
  profileUrl: getProfileUrl(),
  timestamp: new Date().toISOString(),
};

// Send the data to the background script
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.sendMessage({
    action: "storeProfileData",
    profileData: profileData,
  });
} else {
  console.warn("Chrome runtime environment not detected.");
}
