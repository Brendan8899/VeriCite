// Check if the URL is a Google Docs Document URL
export function isGoogleDocsUrl(url) {
	return url?.startsWith('https://docs.google.com/document/');
}

// extractUrl function to find the first URL in the citation
export function extractUrl(citation) {
	const urlRegex = /https?:\/\/[^\s]+/g;
	const match = citation.match(urlRegex);
	return match ? match[0] : null;
}

// Check if the URL exists by sending a HEAD request
export async function checkUrlExists(url) {
	try {
		const response = await fetch(url, { method: 'HEAD' });
		return response.ok;
	} catch (error) {
		console.error(error);
		return false;
	}
}

// Validate if the URL in the citation is reachable
export async function isValidUrl(citation) {
	const url = extractUrl(citation);
	if (!url) return { found: false, reachable: false };
	const reachable = await checkUrlExists(url);
	return { found: true, url, reachable };
}

export function normalizeWhitespace(citation) {
	// Replace multiple consecutive whitespace character with a single space and trim Leading/trailing whitespace
	return citation.replace(/\s+/g, ' ').trim();
}
