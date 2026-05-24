import { extractSourceFields } from './sourceFieldsExtraction.js';

// Google Books API from https://developers.google.com/books/docs/v1/using#PerformingSearch
const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

// Build the Google Books API URL Query Parameters to get the Best Search Possible
export function buildGoogleBooksQuery(citation, fields) {
	let constructedFieldQuery = {};
	// Replace Hyphens with no space in ISBN Number if Applicable
	// Return constructedFieldQuery if ISBN is Available
	if (fields.isbn) {
		constructedFieldQuery.isbn = `${fields.isbn.replace(/[-\s]/g, '')}`;
		return encodeURIComponent(JSON.stringify(fields));
	}

	// Construct query parts based on field information availability
	if (fields.title) constructedFieldQuery.intitle = fields.title;
	if (fields.author) constructedFieldQuery.inauthor = fields.author;
	if (fields.publisher) constructedFieldQuery.inpublisher = fields.publisher;

	const finalBooksQuery =
		encodeURIComponent(citation) + '+' + encodeURIComponent(JSON.stringify(fields));

	return finalBooksQuery;
}

// Normalize text so citation fields and Google Books results can be compared
//  without casing or punctuation differences.
export function normalizeForCompare(value) {
	return String(value || '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

// Returns a Boolean to show if either Source or Target are Substrings of each other
export function includesComparable(source, target) {
	// Normalize Source and Target to compare and find inclusion exact match
	const normalizedSource = normalizeForCompare(source);
	const normalizedTarget = normalizeForCompare(target);
	return Boolean(
		normalizedSource &&
		normalizedTarget &&
		(normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)),
	);
}

// Normalize ISBN Values by dropping all hyphens and replacing with empty string
export function normalizeIsbn(value) {
	return String(value || '')
		.replace(/[-\s]/g, '')
		.toUpperCase();
}

// Scoring the Books that Google Book API returned to show Best Match
export function scoreBookMatch(fields, book) {
	let score = 0;

	// ISBN is the strongest signal because it identifies a specific book edition.
	if (fields.isbn && book.isbn && normalizeIsbn(fields.isbn) === normalizeIsbn(book.isbn)) {
		score += 4;
	}

	// Title match is the next most reliable signal from a citation.
	if (fields.title && includesComparable(fields.title, book.title)) {
		score += 2;
	}

	// Give credit if any cited author appears in the Google Books author list.
	if (fields.authors?.length && book.authors?.length) {
		// If the Authors Extracted Matches the Authors in the Book returned from Google Book API increment score\
		for (let extracted_author in fields.author) {
			for (let returned_author in book.authors) {
				if (includesComparable(extracted_author, returned_author)) {
					score += 1;
				}
			}
		}
	}

	// Google Books usually returns a full date; compare only the year.
	if (fields.year && book.publishedDate?.startsWith(fields.year)) {
		score += 1;
	}

	return score;
}

export async function verifySource(citation, citationFormat) {
	const fields = extractSourceFields(citation, citationFormat);
	const query = buildGoogleBooksQuery(citation, fields);

	const response = await fetch(`${GOOGLE_BOOKS_API_URL}?q=${query}`);

	if (!response.ok) {
		return {
			ok: false,
			valid: false,
			bestMatch: null,
			matches: [],
			errors: [`Google Books API request failed with status ${response.status}`],
		};
	}

	const data = await response.json();
	const matches = (data.items || [])
		.map(mapGoogleBookItem)
		.map((book) => ({ ...book, score: scoreBookMatch(fields, book) }))
		.sort((a, b) => b.score - a.score);

	const bestMatch = matches[0] || null;

	return {
		ok: true,
		valid: Boolean(bestMatch && bestMatch.score >= 3),
		fields,
		bestMatch,
		matches,
		errors: bestMatch ? [] : ['No matching book found in Google Books'],
	};
}
