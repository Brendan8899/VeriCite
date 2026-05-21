import { isGoogleDocsUrl } from "./utility.js";

let token = null;

// Fetch the Google Document that the User is Looking at
async function fetchGoogleDoc(documentId) {
  // Request URL based on Documentation
  const requestUrl = `https://docs.googleapis.com/v1/documents/${documentId}`;

  // Fetch the response which would be the document information
  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Docs API request failed with status ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function commentTest(documentId) {
  // Request URL based on Documentation
  const requestUrl = `https://www.googleapis.com/drive/v3/files/${documentId}/comments`;

  // Fetch the response which would be the document information
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body:{
    "anchor": string,
    "content": string,
    "quotedFileContent": {
      "mimeType": string,
      "value": string
    },
    "assigneeEmailAddress": string
  }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Docs API request failed with status ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Filter out irrelevant elements from doc.body.content
function extractParagraphsFromGoogleDoc(doc) {
  return (doc.body?.content || [])
    .map((element) => paragraphToText(element.paragraph))
    .filter(Boolean);
}

// If its an empty paragrpah or null return empty string
function paragraphToText(paragraph) {
  if (!paragraph?.elements) {
    return "";
  }

  return paragraph.elements
    .map((element) => element.textRun?.content || "")
    .join("")
    .trim();
}

function extractReferencesFromParagraphs(paragraphs) {
  const referencesStartIndex = paragraphs.findIndex((paragraph) => {
    return /^(references|bibliography|works cited)$/i.test(paragraph.trim());
  });

  if (referencesStartIndex === -1) {
    return [];
  }

  return paragraphs.slice(referencesStartIndex + 1);
}

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
    console.log("BEGIN_PROCESSING received", message);

    // If token does not exists, user is not authenticated yet, do not proceed with processing
    if (!token) {
      console.log("BEGIN_PROCESSING failed: missing token");
      sendResponse({
        ok: false,
        error: "Not authenticated"
      });
      return true;
    }

    // User is authenticated, proceed with processing
    const url = message.tab.url;
    if (!isGoogleDocsUrl(url)) {
      console.log("BEGIN_PROCESSING failed: not a Google Docs URL", url);
      sendResponse({
        ok: false,
        error: "Not a Google Docs document"
      });

      return true;
    }

    // Regex to extract the document ID from the Google Docs URL
    const match = url.match(/\/d\/([^/]+)/);
    const documentId = match ? match[1] : null;

    // If documentId not found, then return an error
    if (!documentId) {
        console.log("BEGIN_PROCESSING failed: invalid document ID", url);
        sendResponse({ ok: false, error: "Invalid document ID" });
        return true;
    }

    fetchGoogleDoc(documentId)
      .then((doc) => {
        const paragraphs = extractParagraphsFromGoogleDoc(doc);
        const references = extractReferencesFromParagraphs(paragraphs);
        const referencesText = references.join("\n");

        console.log(doc);
        console.log("Extracted references", references);

        // PlaceHolder sendResponse for now
        sendResponse({
          ok: true,
          documentId,
          citationFormat: message.citationFormat,
          references,
          referencesText
        });
      })
      .catch((error) => {
        console.error("BEGIN_PROCESSING failed:", error);

        // PlaceHolder sendResponse for now
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }
});
