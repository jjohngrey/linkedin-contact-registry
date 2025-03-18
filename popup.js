document.addEventListener("DOMContentLoaded", () => {
    const nameElement = document.getElementById("name")
    const copyBtn = document.getElementById("copyBtn")
    const statusElement = document.getElementById("status")
  
    // Query the active tab to get the LinkedIn profile name
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Check if we're on a LinkedIn profile page
      if (tabs[0].url.includes("linkedin.com/in/")) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getName" }, (response) => {
          if (response && response.name) {
            nameElement.textContent = response.name
          } else {
            nameElement.textContent = "Could not extract name"
            nameElement.classList.add("error")
          }
        })
      } else {
        nameElement.textContent = "Not on a LinkedIn profile page"
        nameElement.classList.add("error")
        copyBtn.disabled = true
      }
    })
  
    // Copy name to clipboard when button is clicked
    copyBtn.addEventListener("click", () => {
      const name = nameElement.textContent
  
      if (
        name &&
        name !== "Loading..." &&
        name !== "Could not extract name" &&
        name !== "Not on a LinkedIn profile page"
      ) {
        navigator.clipboard.writeText(name).then(
          () => {
            statusElement.textContent = "Name copied to clipboard!"
            setTimeout(() => {
              statusElement.textContent = ""
            }, 2000)
          },
          () => {
            statusElement.textContent = "Failed to copy name"
            statusElement.style.color = "#d32f2f"
          },
        )
      }
    })
  })
  
  document.addEventListener("DOMContentLoaded", () => {
    const authBtn = document.getElementById("authBtn")
    const authStatus = document.getElementById("authStatus")
    const authSection = document.getElementById("authSection")
    const dataSection = document.getElementById("dataSection")
  
    const nameElement = document.getElementById("name")
    const roleElement = document.getElementById("role");
    const companyElement = document.getElementById("company");
    const profileUrlElement = document.getElementById("profileUrl")
  
    const sheetIdInput = document.getElementById("sheetId")
    const sheetNameInput = document.getElementById("sheetName")
    const exportBtn = document.getElementById("exportBtn")
    const exportStatus = document.getElementById("exportStatus")
  
    let profileData = null
  
    // Load saved settings
    chrome.storage.sync.get(["sheetId", "sheetName"], (items) => {
      if (items.sheetId) sheetIdInput.value = items.sheetId
      if (items.sheetName) sheetNameInput.value = items.sheetName || "Sheet1"
    })
  
    // Check if user is authenticated with Google
    checkAuthStatus()
  
    // Auth button click handler
    authBtn.addEventListener("click", () => {
      authenticateWithGoogle()
    })
  
    // Export button click handler
    exportBtn.addEventListener("click", () => {
      const sheetId = sheetIdInput.value.trim()
      const sheetName = sheetNameInput.value.trim() || "Sheet1"
  
      if (!sheetId) {
        exportStatus.textContent = "Please enter a Google Sheet ID"
        exportStatus.className = "status error"
        return
      }
  
      // Save settings
      chrome.storage.sync.set({
        sheetId: sheetId,
        sheetName: sheetName,
      })
  
      exportToGoogleSheet(profileData, sheetId, sheetName)
    })
  
    // Query the active tab to get the LinkedIn profile data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Check if we're on a LinkedIn profile page
      if (tabs[0].url.includes("linkedin.com/in/")) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getProfileData" }, (response) => {
          if (response) {
            profileData = response
            displayProfileData(profileData)
          } else {
            displayError("Could not extract profile data")
          }
        })
      } else {
        displayError("Not on a LinkedIn profile page")
        exportBtn.disabled = true
      }
    })
  
    function displayProfileData(data) {
      nameElement.textContent = data.name || "Not found";
      roleElement.textContent = data.role || "Not found";
      companyElement.textContent = data.company || "Not found";
      profileUrlElement.textContent = data.profileUrl || "Not found"
    }
  
    function displayError(message) {
      nameElement.textContent = message
      nameElement.classList.add("error");
      roleElement.textContent = "";
      companyElement.textContent = "";
      profileUrlElement.textContent = ""
    }
  
    function checkAuthStatus() {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          // Not authenticated
          authSection.style.display = "block"
          dataSection.style.display = "none"
        } else {
          // Already authenticated
          authSection.style.display = "none"
          dataSection.style.display = "block"
        }
      })
    }
  
    function authenticateWithGoogle() {
      authBtn.disabled = true
      authStatus.textContent = "Connecting..."
  
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          authStatus.textContent = "Authentication failed: " + chrome.runtime.lastError.message
          authStatus.className = "status error"
          authBtn.disabled = false
          return
        }
  
        if (token) {
          authStatus.textContent = "Connected successfully!"
          authStatus.className = "status success"
  
          // Show data section after successful authentication
          setTimeout(() => {
            authSection.style.display = "none"
            dataSection.style.display = "block"
          }, 1000)
        }
      })
    }
  
    function exportToGoogleSheet(data, sheetId, sheetName) {
      if (!data) {
        exportStatus.textContent = "No data to export"
        exportStatus.className = "status error"
        return
      }
  
      exportBtn.disabled = true
      exportStatus.textContent = "Exporting..."
      exportStatus.className = "status"
  
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          exportStatus.textContent = "Authentication required"
          exportStatus.className = "status error"
          exportBtn.disabled = false
  
          // Show auth section again
          authSection.style.display = "block"
          dataSection.style.display = "none"
          return
        }
  
        // First, check if the sheet exists and get the next row
        fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?ranges=${sheetName}&fields=sheets.properties,sheets.data.rowData.values`,
          {
            headers: {
              Authorization: "Bearer " + token,
            },
          },
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error("Sheet not found or not accessible")
            }
            return response.json()
          })
          .then((sheetData) => {
            // Check if the sheet exists
            const sheet = sheetData.sheets.find((s) => s.properties.title === sheetName)
            if (!sheet) {
              throw new Error(`Sheet "${sheetName}" not found`)
            }
  
            // Determine the next row to append data
            let nextRow = 1
            if (sheet.data && sheet.data[0].rowData) {
              nextRow = sheet.data[0].rowData.length + 1
            }
  
            // If it's the first row, add headers
            if (nextRow === 1) {
              // Add headers first
              return appendToSheet(token, sheetId, sheetName, [["Name", "Role", "Company", "Profile URL", "Timestamp"]]).then(
                () => {
                  // Then add the data
                  return appendToSheet(token, sheetId, sheetName, [
                    [data.name, data.role, data.company, data.profileUrl, new Date().toLocaleString()],
                  ])
                },
              )
            } else {
              // Just add the data
              return appendToSheet(token, sheetId, sheetName, [
                [data.name, data.role, data.company, data.profileUrl, new Date().toLocaleString()],
              ])
            }
          })
          .then(() => {
            exportStatus.textContent = "Data exported successfully!"
            exportStatus.className = "status success"
            setTimeout(() => {
              exportBtn.disabled = false
            }, 2000)
          })
          .catch((error) => {
            exportStatus.textContent = "Error: " + error.message
            exportStatus.className = "status error"
            exportBtn.disabled = false
          })
      })
    }
  
    function appendToSheet(token, sheetId, sheetName, values) {
      return fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}:append?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: values,
          }),
        },
      ).then((response) => {
        if (!response.ok) {
          return response.json().then((err) => {
            throw new Error(err.error.message || "Failed to append data")
          })
        }
        return response.json()
      })
    }
  })
  
  