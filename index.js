import { isGoogleDocsUrl } from "./utility.js";

// Get the Current Active Tab
async function getCurrentTab() {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  return tab;
}

document.addEventListener("DOMContentLoaded", async () => {
  const statusText = document.getElementById("status");
  const loginButton = document.getElementById("login-button");
  const cancelButton = document.getElementById("cancel-button");
  const loginPage = document.getElementById("login-page");
  const settingsPage = document.getElementById("settings-page");
  const citationFormat = document.getElementById("citation-format");
  const referencesStartPage = document.getElementById("references-start-page");
  const continueButton = document.getElementById("continue-button");
  const backButton = document.getElementById("back-button");

  if (!statusText || !loginButton || !cancelButton || !loginPage || !settingsPage || !citationFormat ||
    !referencesStartPage || !continueButton || !backButton) {
    console.error("Required elements not found in the DOM.");
    return;
  }

  // Get the current active tab and check if it's a Google Docs document
  const currentTab = await getCurrentTab();
  
  // If the current tab is not a Google Docs document, show an error message and disable the login button
  if (!isGoogleDocsUrl(currentTab.url)) {
    statusText.textContent = "Please open a Google Docs document first.";
    loginButton.disabled = true;
    continueButton.disabled = true;
    return;
  }

  // User has clicked the login button, send a message to the service worker to initiate the Google Login Process
  loginButton.addEventListener("click", async () => {
    statusText.textContent = "Logging in...";
    try {
      const response = await browser.runtime.sendMessage({
        type: "GOOGLE_LOGIN"
      });

      // Login is successful, hide the login page and show the settings page, otherwise show an error message
      if (response?.ok) {
        statusText.textContent = "Logged in successfully.";
        loginPage.hidden = true;
        settingsPage.hidden = false;
      } else {
        console.error("Login failed", response?.error);
        statusText.textContent = "Login failed";
      }
    } catch (error) {
      console.log(error);
      statusText.textContent = "Login failed";
    }
  });

  // User has clicked the continue button, save the settings to local storage and send message to service worker to begin processing
  continueButton.addEventListener("click", async () => {
    const format = citationFormat.value;
    const startPage = Number(referencesStartPage.value);

    // If the user has not selected a citation format, show an error message and return
    if (!format) {
        alert("Please select a citation format.");
        return;
    }
    
    // If the user has not entered a valid references start page, show an error message and return
    if (!startPage || startPage < 1) {
        alert("Please enter a valid references start page.");
        return;
    }

    // Save the settings to local storage
    await browser.storage.local.set({
        citationFormat: format,
        referencesStartPage: startPage
    });

    // Send a message to the service worker to begin processing
    // include citationFormat, referencesStartPage and the current active tab in the message
    const response = await browser.runtime.sendMessage({
        type: "BEGIN_PROCESSING",
        citationFormat: format,
        referencesStartPage: startPage,
        tab: currentTab
    });
  });

  // User has clicked the back button, hide the settings page
  backButton.addEventListener("click", () => {
    settingsPage.hidden = true;
    loginPage.hidden = false;
  });

  // User has clicked the cancel button, close the popup
  cancelButton.addEventListener("click", () => {
    window.close();
  });
});
