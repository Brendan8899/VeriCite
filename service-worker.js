import { isGoogleDocsUrl } from "./utility.js";
import { isValidAPA } from "./verifyAPA.js";

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

  return await response.json();
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

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GOOGLE_LOGIN") {
    browser.identity.getAuthToken({ interactive: true })
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
    const match = url.match(/\/d\/([^/]+)/);
    const documentId = match ? match[1] : null;

    // If documentId not found, then return an error
    if (!documentId) {
        sendResponse({ ok: false, error: "Invalid document ID" });
        return true;
    }

    fetchGoogleDoc(documentId)
      .then(async (doc) => {
        let result = []
        const paragraphs = extractParagraphsFromGoogleDoc(doc);
        const references = extractReferencesFromParagraphs(paragraphs);
        for (let i of references) {
          let validityResult = null;
          if (message.citationFormat === "APA") {
             validityResult = await isValidAPA(i);
          } else if (message.citationFormat === "MLA") {
            // validityResult = await isValidMLA(i);
          } else if (message.citationFormat === "Chicago") {
            // validityResult = await isValidChicago(i);
          } else if (message.citationFormat === "IEEE") {
            // validityResult = await isValidIEEE(i);
          }
          if (validityResult) {
            result.push({i, validityResult});
          } else {
            pass
          }
        }
        console.log("Processing complete", result);
      }).then(
        result => sendResponse(result)
      )
      .catch((error) => {
        // PlaceHolder sendResponse for now
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }
});
