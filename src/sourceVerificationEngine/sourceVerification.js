// Google Books API from https://developers.google.com/books/docs/v1/using#PerformingSearch
const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

// Build the Google Books API URL Query Parameters to get the Best Search Possible
export function buildGoogleBooksFields(citation, fields) {
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

	return constructedFieldQuery;
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
export function scoreBookMatch(citation, transformedBook) {
	let score = 0;
	// ISBN is the strongest signal because it identifies a specific book edition.
	// Transformed Book ISBN field is an Array of ISBN Numbers
	if (citation && transformedBook.isbn && Array.isArray(transformedBook.isbn)) {
		for (const isbnNumber of transformedBook.isbn) {
			if (citation.includes(isbnNumber)) {
				score += 4;
			}
		}
	}

	// Title match is the next most reliable signal from a citation.
	if (citation && includesComparable(citation, transformedBook.title)) {
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
	if (citation && citation.includes(transformedBook?.publishedDate)) {
		score += 1;
	}

	return score;
}

// Transforms Raw Google Book Item returned by the API to a more accessible version for better score calculation
export function transformGoogleBookItem(rawGoogleBookItem) {
	const result = {};
	// Authors Field is an Array
	if (rawGoogleBookItem?.volumeInfo?.authors) {
		result.authors = rawGoogleBookItem.volumeInfo.authors;
		// Title Field is a String
	}
	if (rawGoogleBookItem?.volumeInfo?.title) {
		result.title = rawGoogleBookItem.volumeInfo.title;
		// Published Date is a String
	}
	if (rawGoogleBookItem?.volumeInfo?.publishedDate) {
		result.publishedDate = rawGoogleBookItem.volumeInfo.publishedDate;
		// industryIdentifiers is an Array of Items
	}
	if (
		rawGoogleBookItem?.volumeInfo?.industryIdentifiers &&
		Array.isArray(rawGoogleBookItem?.volumeInfo?.industryIdentifiers)
	) {
		result.isbn = [];
		for (let industryIdentifier of rawGoogleBookItem.volumeInfo.industryIdentifiers) {
			if (
				(industryIdentifier?.type === 'ISBN_10' || industryIdentifier.type === 'ISBN_13') &&
				industryIdentifier.identifier
			) {
				result.isbn.push(industryIdentifier);
			}
		}
	}
	return result;
}

export async function verifySource(citation, citationFormat, userToken) {
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
			bestMatch: null,
			matches: [],
			errors: [`Google Books API request failed with status ${response.status}`],
		};
	}

	const data = await response.json();
	const matches = (data.items || [])
		.map((book) => {
			return transformGoogleBookItem(book);
		})
		.map((transformedBook) => {
			return { ...transformedBook, score: scoreBookMatch(citation, transformedBook) };
		})
		.sort((a, b) => b.score - a.score);
	const bestMatch = matches[0] || null;

	const resultErrors = [];

	if (bestMatch) {
		if (bestMatch.score < 3) {
			resultErrors.push('Book found may not be matching. Please verify if reference exists.');
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
	};
}
