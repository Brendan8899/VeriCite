// Finds a publication year from 1800 to 2099.
const YEAR_REGEX = /\b(?:18|19|20)\d{2}\b/;

// Finds an ISBN-10 or ISBN-13, with optional "ISBN", hyphens, or spaces.
// ISBN-10 is 10 Digits Long Legacy Version, ISBN-13 is 13-Digit Long Modern Version
const ISBN_10_REGEX =
	/^(?:ISBN(?:-10)?:?\s*)?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$)[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;
const ISBN_13_REGEX =
	/^(?:ISBN(?:-13)?:?\s*)?(?=[0-9]{13}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)97[89][- ]?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9]$/;

// Finds a title wrapped in straight quotes or curly opening/closing quotes.
// ["\u201c] refers to Opening Quotes
// [^"\u201d]+ refers to all texts that is not Closing Quotes
// ["\u201d] refers to Closing Quotes
const QUOTED_TITLE_REGEX = /["\u201c]([^"\u201d]+)["\u201d]/;

// Finds the APA author section before the year, e.g. "Smith, J. (2024)."
const APA_PERSON_AUTHOR_REGEX = /^(.+?)\s*\((?:\d{4}|n\.d\.)[^)]*\)\./i;

// Finds the APA title after the year, e.g. "(2024). Book title."
const APA_TITLE_REGEX = /\((?:\d{4}|n\.d\.)[^)]*\)\.\s+(.+?)\./i;

// Finds the Person Author Names in IEEE Citation in the form of F. Lastname or F. M. Lastname
const IEEE_PERSON_AUTHOR_REGEX = /[A-Z]\.\s*(?:[A-Z]\.\s*)?[A-Z][a-zA-ZÀ-ÖØ-öø-ÿ'’.-]+/g;

// Finds the Organization Author Name in IEEE Citation
const IEEE_ORG_AUTHOR_REGEX =
	/^\[\d+\]\s+([A-Z][a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]*(?:\s+[a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]+)*)[.,]/;

function matchField(text, regex, group) {
	const match = text.match(regex);
	if (match && match.length && match.length <= group) {
		return match[group];
	} else {
		return '';
	}
}

// Do Title Extraction Based on Citation Format of the Citation
function extractTitle(citation, citationFormat) {
	if (citationFormat === 'IEEE') {
		// IEEE Titles are normally wrapped in Quotation Marks
		const quotedTitle = matchField(citation, QUOTED_TITLE_REGEX, 1);
		if (quotedTitle !== '') return quotedTitle;
		// If the Title is not wrapped in Quotation Marks, quotedTitle is an Empty String
		else if (quotedTitle === '') {
			// To Do: Use Text Style Italics in Order to Extract
			// @Brendan8899
			return '';
		}
	} else if (citationFormat === 'APA') {
		const quotedTitle = matchField(citation, APA_TITLE_REGEX, 1);
		if (quotedTitle !== '') {
			return quotedTitle;
		} else {
			return '';
		}
	} else {
		return '';
	}
}

// Do Author Extraction Based on Citation Format of the Citation
function extractAuthors(citation, citationFormat) {
	if (citationFormat === 'IEEE') {
		// IEEE starts with an index number, then the author names before the quoted title.
		const ieeeAuthors = citation.match(IEEE_PERSON_AUTHOR_REGEX);
		if (ieeeAuthors) {
			return ieeeAuthors;
		} else {
			// If ieeeAuthors is Empty, it could be because its an Organizational Author, so we try to extract Organizational Author Name
			const ieeeOrgAuthor = matchField(citation, IEEE_ORG_AUTHOR_REGEX, 1);
			if (ieeeOrgAuthor !== '') return [ieeeOrgAuthor];
			else return [];
		}
	} else if (citationFormat === 'APA') {
		// APA places the author section before the year in parentheses.
		const apaAuthor = matchField(citation, APA_PERSON_AUTHOR_REGEX, 1);
		if (apaAuthor) return [apaAuthor];
		else return [];
	} else {
		return [];
	}
}

// Do ISBN Extraction for the Citation
function extractISBN(citation) {
	if (ISBN_13_REGEX.test(citation)) {
		const fullISBNtext = matchField(citation, ISBN_13_REGEX, 0);
		return cleanISBN(fullISBNtext);
	} else if (ISBN_10_REGEX.test(citation)) {
		const fullISBNtext = matchField(citation, ISBN_10_REGEX, 0);
		return cleanISBN(fullISBNtext);
	} else {
		return null;
	}
}

// Drop the ISBN-10: or ISBN-13: at the front as Google Docs API Expect ISBN Numbers
function cleanISBN(value) {
	return String(value || '')
		.replace(/^ISBN(?:-1[03])?:?\s*/i, '')
		.replace(/[-\s]/g, '')
		.toUpperCase();
}

export function extractSourceFields(citation, citationFormat) {
	const title = extractTitle(citation, citationFormat);
	const authors = extractAuthors(citation, citationFormat);
	const year = matchField(citation, YEAR_REGEX, 0);
	const isbn = extractISBN(citation);

	return {
		title,
		authors,
		author: authors[0] || '',
		year,
		isbn: isbn ? isbn : null,
	};
}
