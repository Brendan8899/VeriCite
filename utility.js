// Check if the URL is a Google Docs Document URL
export function isGoogleDocsUrl(url) {
  return url?.startsWith("https://docs.google.com/document/");
}

