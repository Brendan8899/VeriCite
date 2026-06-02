import browser from 'webextension-polyfill';

import { feedbackGeneration } from './src/feedbackGenerationEngine/feedbackGeneration';
import { verifySource } from './src/sourceVerificationEngine/sourceVerification';
import type {
	FinalCheckResult,
	FormatValidationResult,
	VerifySourceResult,
	RuntimeMessageType,
	RuntimeResponse,
} from './src/types.js';
import { isGoogleDocsUrl, normalizeWhitespace } from './src/utility/utility';
import { isValidAPA } from './src/verifyAPA';
import { isValidIEEE } from './src/verifyIEEE';

type GoogleDoc = {
	body?: {
		content?: GoogleDocStructuralElement[];
	};
};

type GoogleDocStructuralElement = {
	paragraph?: GoogleDocParagraph;
};

type GoogleDocParagraph = {
	elements?: GoogleDocParagraphElement[];
};

type GoogleDocParagraphElement = {
	textRun?: {
		content?: string;
	};
};

let token: string | null = null;

// Fetch the Google Document that the User is Looking at
async function fetchGoogleDoc(documentId: string): Promise<GoogleDoc> {
	// Request URL based on Documentation
	const requestUrl = `https://docs.googleapis.com/v1/documents/${documentId}`;

	// Fetch the response which would be the document information
	const response = await fetch(requestUrl, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Docs API request failed with status ${response.status}: ${errorText}`);
	}

	return (await response.json()) as GoogleDoc;
}

// Filter out irrelevant elements from doc.body.content
function extractParagraphsFromGoogleDoc(doc: GoogleDoc): string[] {
	return (doc.body?.content || [])
		.map((element) => paragraphToText(element.paragraph))
		.filter(Boolean);
}

// If its an empty paragrpah or null return empty string
function paragraphToText(paragraph: GoogleDocParagraph | undefined): string {
	if (!paragraph?.elements) {
		return '';
	}

	return paragraph.elements
		.map((element) => element.textRun?.content || '')
		.join('')
		.trim();
}

function extractReferencesFromParagraphs(paragraphs: string[]): string[] {
	const referencesStartIndex = paragraphs.findIndex((paragraph) => {
		return /^(references|bibliography|works cited)$/i.test(paragraph.trim());
	});

	if (referencesStartIndex === -1) {
		return [];
	}

	return paragraphs.slice(referencesStartIndex + 1);
}

function mergeErrorsAndWarnings(
	validityResults: FormatValidationResult,
	verificationResults: VerifySourceResult,
): FormatValidationResult {
	const finalResults = validityResults;
	if (verificationResults?.errors && finalResults?.errors) {
		finalResults.errors.push(...verificationResults.errors);
	}
	if (verificationResults?.warnings && finalResults?.warnings) {
		finalResults.warnings.push(...verificationResults.warnings);
	}
	return finalResults;
}

function isRuntimeMessage(message: unknown): message is RuntimeMessageType {
	if (typeof message !== 'object' || message === null || !('type' in message)) {
		return false;
	}

	const msg = message as { type?: unknown };

	return msg.type === 'GOOGLE_LOGIN' || msg.type === 'BEGIN_PROCESSING';
}

browser.runtime.onMessage.addListener(
	async (message: unknown, _sender: any): Promise<RuntimeResponse | undefined> => {
		if (!isRuntimeMessage(message)) {
			return {
				ok: false,
				error: 'Invalid Runtime Message',
			};
		} else if (message.type === 'GOOGLE_LOGIN') {
			try {
				const redirectURL = browser.identity.getRedirectURL();
				const clientID = '597339304581-i5tol3c0hmcstu97dm6cfbg9itvob81p.apps.googleusercontent.com';
				const scopes = [
					'https://www.googleapis.com/auth/documents',
					'https://www.googleapis.com/auth/books',
				];
				let authURL = 'https://accounts.google.com/o/oauth2/v2/auth';
				authURL += `?client_id=${clientID}`;
				authURL += `&response_type=token`;
				authURL += `&redirect_uri=${encodeURIComponent(redirectURL)}`;
				authURL += `&scope=${encodeURIComponent(scopes.join(' '))}`;
				const responseURL = await browser.identity.launchWebAuthFlow({
					interactive: true,
					url: authURL,
				});

				const params = new URLSearchParams(new URL(responseURL).hash.slice(1));
				token = params.get('access_token');
				return {
					ok: true,
				};
			} catch (error) {
				return {
					ok: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				};
			}
		} else if (message.type === 'BEGIN_PROCESSING') {
			console.log('BEGIN_PROCESSING received', message);

			// If token does not exists, user is not authenticated yet, do not proceed with processing
			if (!token) {
				return {
					ok: false,
					error: 'Not authenticated',
				};
			}
			const authToken = token;

			// User is authenticated, proceed with processing
			const url = message.tab.url;
			if (!isGoogleDocsUrl(url)) {
				return {
					ok: false,
					error: 'Not a Google Docs document',
				};
			}

			// Regex to extract the document ID from the Google Docs URL
			const match = url?.match(/\/d\/([^/]+)/);
			const documentId = match ? match[1] : null;

			// If documentId not found, then return an error
			if (!documentId) {
				return { ok: false, error: 'Invalid document ID' };
			}

			fetchGoogleDoc(documentId)
				.then(async (doc) => {
					const result: FinalCheckResult[] = [];
					// Paragraphs are defined as text seperated by a newline character in the document
					const paragraphs = extractParagraphsFromGoogleDoc(doc);
					// Afterward, use keywords (references|bibliography|works cited) to find where the references start from
					const originalReferences = extractReferencesFromParagraphs(paragraphs);
					const references = originalReferences.map((reference) => normalizeWhitespace(reference));
					// We use index based iteration to better keep track of originalReferences and references
					for (const [i, _] of references.entries()) {
						let validityResult: FormatValidationResult | null = null;
						const verificationResult = await verifySource(references[i], authToken);
						if (message.citationFormat === 'APA') {
							validityResult = await isValidAPA(references[i]);
						} else if (message.citationFormat === 'MLA') {
							// validityResult = await isValidMLA(i);
						} else if (message.citationFormat === 'IEEE') {
							validityResult = await isValidIEEE(references[i]);
						}
						if (validityResult && verificationResult) {
							validityResult = mergeErrorsAndWarnings(validityResult, verificationResult);
							if (verificationResult?.ok && verificationResult?.valid) {
								validityResult.sourceVerified = true;
							}
							result.push({
								originalReference: originalReferences[i],
								reference: references[i],
								validityResults: validityResult,
							});
						}
					}
					const feedbackReport = await feedbackGeneration(result);
					console.log('Processing complete', result);

					return {
						ok: true,
						result,
						feedbackReport,
					};
				})
				.catch((error: Error) => {
					// PlaceHolder sendResponse for now
					return {
						ok: false,
						error: error.message,
					};
				});
		}
	},
);
