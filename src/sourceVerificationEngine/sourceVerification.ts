import { TransformedBookStructure, VerifySourceResult, ScoredBookMatch } from '../types';

// Google Books API from https://developers.google.com/books/docs/v1/using#PerformingSearch
const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

// Normalize text so citation fields and Google Books results can be compared
//  without casing or punctuation differences.
export function normalizeForCompare(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

// Returns a Boolean to show if either Source or Target are Substrings of each other
export function includesComparable(
	source: string | undefined,
	target: string | undefined,
): boolean {
	if (source === undefined || target === undefined) {
		return false;
	} else {
		// Normalize Source and Target to compare and find inclusion exact match
		const normalizedSource = normalizeForCompare(source);
		const normalizedTarget = normalizeForCompare(target);
		return Boolean(
			normalizedSource &&
			normalizedTarget &&
			(normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)),
		);
	}
}

// Normalize ISBN Values by dropping all hyphens and replacing with empty string
export function normalizeIsbn(value: string): string {
	return value.replace(/[-\s]/g, '').toUpperCase();
}

// Scoring the Books that Google Book API returned to show Best Match
export function scoreBookMatch(
	citation: string,
	transformedBook: TransformedBookStructure,
): number {
	let score = 0;
	// ISBN is the strongest signal because it identifies a specific book edition.
	// Transformed Book ISBN field is an Array of ISBN Numbers
	if (citation) {
		for (const isbnNumber of transformedBook.isbn) {
			if (citation.includes(isbnNumber)) {
				score += 4;
			}
		}
	}

	// Title match is the next most reliable signal from a citation.
	if (citation && includesComparable(citation, transformedBook.title ?? undefined)) {
		score += 2;
	}

	// Give credit if any cited author appears in the Google Books author list.
	if (
		citation &&
		transformedBook?.authors &&
		Array.isArray(transformedBook?.authors) &&
		transformedBook.authors?.length
	) {
		// If the Authors Extracted Matches the Authors in the Book returned from Google Book API increment score\
		for (let returned_author of transformedBook.authors) {
			if (includesComparable(citation, returned_author)) {
				score += 1;
			}
		}
	}

	// Google Books usually returns a full date; compare only the year.
	if (
		citation &&
		transformedBook?.publishedDate &&
		citation.includes(transformedBook?.publishedDate)
	) {
		score += 1;
	}

	return score;
}

// Transforms Raw Google Book Item returned by the API to a more accessible version for better score calculation
export function transformGoogleBookItem(rawGoogleBookItem: any): TransformedBookStructure {
	const result: TransformedBookStructure = {
		authors: [],
		title: undefined,
		isbn: [],
		publishedDate: undefined,
	};

	if (typeof rawGoogleBookItem !== 'object' || rawGoogleBookItem === null) {
		return result;
	}

	// Authors Field is an Array
	if (
		rawGoogleBookItem?.volumeInfo?.authors &&
		Array.isArray(rawGoogleBookItem?.volumeInfo?.authors)
	) {
		result.authors = rawGoogleBookItem.volumeInfo.authors;
	}
	// Title Field is a String
	if (
		rawGoogleBookItem?.volumeInfo?.title &&
		typeof rawGoogleBookItem?.volumeInfo?.title === 'string'
	) {
		result.title = rawGoogleBookItem.volumeInfo.title;
	}
	// Published Date is a String
	if (rawGoogleBookItem?.volumeInfo?.publishedDate) {
		result.publishedDate = rawGoogleBookItem.volumeInfo.publishedDate;
	}
	// industryIdentifiers is an Array of Items
	if (
		rawGoogleBookItem?.volumeInfo?.industryIdentifiers &&
		Array.isArray(rawGoogleBookItem?.volumeInfo?.industryIdentifiers)
	) {
		result.isbn = [];
		for (let industryIdentifier of rawGoogleBookItem.volumeInfo.industryIdentifiers) {
			if (
				(industryIdentifier?.type === 'ISBN_10' || industryIdentifier.type === 'ISBN_13') &&
				industryIdentifier.identifier &&
				typeof industryIdentifier.identifier === 'string'
			) {
				result.isbn.push(industryIdentifier.identifier);
			}
		}
	}
	return result;
}

export async function verifySource(
	citation: string,
	userToken: string,
): Promise<VerifySourceResult> {
	const queryURL = new URL(GOOGLE_BOOKS_API_URL);
	queryURL.searchParams.set('q', citation);
	const response = await fetch(queryURL.toString(), {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${userToken}`,
		},
	});
	if (!response.ok) {
		return {
			ok: false,
			valid: false,
			bestMatch: undefined,
			matches: [],
			errors: [`Google Books API request failed with status ${response.status}`],
			warnings: [],
		};
	}

	const data = await response.json();
	const matches = (data.items || [])
		.map((book: any) => {
			return transformGoogleBookItem(book);
		})
		.map((transformedBook: TransformedBookStructure) => {
			return { ...transformedBook, score: scoreBookMatch(citation, transformedBook) };
		})
		.sort((a: ScoredBookMatch, b: ScoredBookMatch) => b.score - a.score);
	const bestMatch = matches[0] || undefined;

	const resultErrors = [];
	const resultWarning = [];

	if (bestMatch) {
		if (bestMatch.score < 3) {
			resultWarning.push('Book found may not be matching. Please verify if reference exists.');
		}
	} else if (!bestMatch) {
		resultErrors.push('No matching book found in Google Books');
	}

	return {
		ok: true,
		valid: Boolean(bestMatch && bestMatch.score >= 3),
		bestMatch,
		matches,
		errors: resultErrors,
		warnings: resultWarning,
	};
}
