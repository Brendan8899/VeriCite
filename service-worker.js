import { isGoogleDocsUrl } from "./utility.js";

let token = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GOOGLE_LOGIN") {
    chrome.identity.getAuthToken({ interactive: true })
      .then((result) => {
        token = result.token;
        sendResponse({
          ok: true
        });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }

  if (message.type === "BEGIN_PROCESSING") {
    // If token does not exists, user is not authenticated yet, do not proceed with processing
    if (!token) {
      sendResponse({
        ok: false,
        error: "Not authenticated"
      });
      return true;
    }

    // User is authenticated, proceed with processing
    const url = message.tab.url;
    if (!isGoogleDocsUrl(url)) {
      sendResponse({
        ok: false,
        error: "Not a Google Docs document"
      });

      return true;
    }

    // Regex to extract the document ID from the Google Docs URL
    const match = url.match(/\/d\/([^/]+)\/edit\?/);
    const documentId = match ? match[1] : null;

    if (!documentId) {
        sendResponse({ ok: false, error: "Invalid document ID" });
        return true;
    }

    const requestURL = `https://docs.googleapis.com/v1/documents/${documentId}`;

    return true;
  }
});