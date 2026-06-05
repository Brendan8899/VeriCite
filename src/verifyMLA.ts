import { HasYearResult, FormatValidationResult } from './types';
import { isValidUrl, checkUrlExists, normalizeWhitespace } from './utility/utility';

// Regex
// matches a bare year
const YEAR_REGEX = /,?\s(\d{4})[,.]/;

// Must have a date — matches "15 Jan. 2021" or "Accessed 20 May 2026."
const PUBLICATION_DATE_REGEX = /\b\d{1,2}\s[A-Z][a-z]+\.?\s\d{4}\b/;
const ACCESSED_DATE_REGEX = /\bAccessed\s\d{1,2}\s[A-Z][a-z]+(?:\s\d{4})\.?/;
// Accessed Regex to detect the Accessed Date Word
const ACCESSED_REGEX = /\bAccessed/;

// URL Regex with Optional https, http or www
const URL_REGEX =
	/(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_.~#?&//=]*)/;

// MLA first author: "Lastname, Firstname" — full first name, not initials
const AUTHOR_REGEX = /^([A-Z][a-zA-ZÀ-ÖØ-öø-ÿ-]+,\s[A-Z][a-z]+|[A-Z][a-zA-Z\s]+\.)/;

const INITIALS_REGEX = /^[A-Z][a-zA-Z-]+,\s[A-Z]\./;

const SECOND_AUTHOR_INVERTED_REGEX = /,\sand\s[A-Z][a-z]+,\s[A-Z][a-z]+/;

const APA_YEAR_REGEX = /^.+?\.\s\(\d{4}\)/;

// Only applies if this looks like an article/chapter (has a container after the title)
// Accept both straight quotes and Unicode smart quotes
const HAS_QUOTED_TITLE_REGEX = /["“”][^"“”]+["“”]/;

const JOURNAL_CITATION_REGEX = /\."?\s[A-Z][a-zA-Z\s]+,\s(?:vol\.|no\.|pp\.)/; //check for existence of format: { "Article." Journal Name, vol. xx, year, pp. pg-pg. }

const CHAPTER_REGEX = /edited\sby/;

const IS_VOL_TRACK_REGEX = /vol\.\s\d+/;

const WWW_REGEX = /www\.[a-zA-Z\p{P}]+/u;

const ISSUE_NUMBER_REGEX = /no\.\s\d+/;

const PAGE_RANGE_REGEX = /pp\.\s\d+/;

const HYPHEN_PAGE_RANGE_REGEX = /pp\.\s\d+-\d+/;

export const ALL_MLA_REGEX = {
	YEAR_REGEX,
	PUBLICATION_DATE_REGEX,
	ACCESSED_DATE_REGEX,
	URL_REGEX,
	AUTHOR_REGEX,
	INITIALS_REGEX,
	SECOND_AUTHOR_INVERTED_REGEX,
	APA_YEAR_REGEX,
	HAS_QUOTED_TITLE_REGEX,
	JOURNAL_CITATION_REGEX,
	CHAPTER_REGEX,
	IS_VOL_TRACK_REGEX,
	WWW_REGEX,
	ISSUE_NUMBER_REGEX,
	PAGE_RANGE_REGEX,
	HYPHEN_PAGE_RANGE_REGEX,
};

// Function to determine if the citation looks like a website by detecting a website
function looksLikeWebsiteCitation(normalised: string): boolean {
	return URL_REGEX.test(normalised);
}

// MLA year is a bare 4-digit number near the end, no parentheses
function hasYearMLA(citation: string): HasYearResult {
	const normalised = normalizeWhitespace(citation);

	const currentYear = new Date().getFullYear();

	// --- Website-specific checks
	if (looksLikeWebsiteCitation(normalised)) {
		// Looks for Publication Date
		const hasPublicationDate = PUBLICATION_DATE_REGEX.test(normalised);
		// Looks for Accessed Date
		const hasAccessDate = ACCESSED_DATE_REGEX.test(normalised);

		const hasAccessedWord = ACCESSED_REGEX.test(normalised);
		// So the Accessed Date is Malformed
		if (hasAccessedWord && !hasAccessDate) {
			return {
				found: false,
				value: undefined,
				errors: [
					'Web citation for Accessed Date must be in the format of Day Month Year. example: Accessed 6 July 2025.',
				],
				warnings: [],
			};
		}

		if (!hasAccessDate && !hasPublicationDate) {
			return {
				found: false,
				value: undefined,
				errors: ['Web citation must include a publication or access date'],
				warnings: [
					'Year of citation not detected. Do check if the citation provides one and update if possible.',
				],
			};
		}
	}

	const year_exists = YEAR_REGEX.test(citation);
	const match = citation.match(YEAR_REGEX);
	let year;

	if (!year_exists)
		return { found: false, value: undefined, errors: ['Year is missing'], warnings: [] };

	if (match && Array.isArray(match) && match.length >= 2) {
		year = parseInt(match[1]);
		if (year < 1800)
			return { found: false, value: undefined, errors: ['Year is implausibly old'], warnings: [] };
		if (year > currentYear)
			return { found: false, value: undefined, errors: ['Year is in the future'], warnings: [] };
	}

	return { found: true, value: year, errors: [], warnings: [] };
}

async function isValidMLA(citation: string): Promise<FormatValidationResult> {
	const normalised = normalizeWhitespace(citation);
	let errors: string[] = [];
	let warnings: string[] = [];

	// --- 1. Author format check
	if (!AUTHOR_REGEX.test(normalised)) {
		warnings.push('If Author is a person, Author could be missing or not correctly formatted');
	}

	// --- 2. Initials check — catches APA-style "Smith, J."
	if (INITIALS_REGEX.test(normalised)) {
		errors.push('Author first name must be full, not abbreviated to initials');
	}

	// --- 3. Second author format — only first author inverted
	// "Smith, John, and Doe, Jane" is wrong — second should be "Jane Doe"
	if (SECOND_AUTHOR_INVERTED_REGEX.test(normalised)) {
		errors.push('Only the first author should be in Last, First format');
	}

	// --- 4. APA year position check — year in parens after author is APA, not MLA

	if (APA_YEAR_REGEX.test(normalised)) {
		errors.push('Year must not appear in parentheses after the author — this is APA format');
	}

	// --- 5. Article title in quotes check
	if (
		(JOURNAL_CITATION_REGEX.test(normalised) ||
			URL_REGEX.test(normalised) ||
			CHAPTER_REGEX.test(normalised)) &&
		!HAS_QUOTED_TITLE_REGEX.test(normalised)
	) {
		errors.push('Article title must be enclosed in double quotation marks');
	}

	// --- 6. Journal-specific checks
	if (JOURNAL_CITATION_REGEX.test(normalised)) {
		if (!IS_VOL_TRACK_REGEX.test(normalised)) {
			errors.push('Volume number (vol.) is missing');
		}
		if (!ISSUE_NUMBER_REGEX.test(normalised)) {
			errors.push('Issue number (no.) is missing');
		}
		if (!PAGE_RANGE_REGEX.test(normalised)) {
			errors.push('Page range (pp.) is missing');
		}
	}

	// --- 7. Page range em-dash check (applies to all source types with pages)
	if (HYPHEN_PAGE_RANGE_REGEX.test(normalised)) {
		errors.push('Page range should use an em-dash (–) not a hyphen (-)');
	}

	// --- 8. Year validity (all source types)
	const yearResult = hasYearMLA(normalised);
	if (!yearResult.found && yearResult.errors) {
		errors = errors.concat(yearResult.errors);
		warnings = warnings.concat(yearResult.warnings);
	}

	// --- 9. URL reachability
	if (looksLikeWebsiteCitation(normalised)) {
		// check if https:// is found in link
		// Then access the link if it is found
		const httpsResult = await isValidUrl(normalised);

		let wwwResult;
		if (!httpsResult.found || !httpsResult.reachable) {
			let match = citation.match(WWW_REGEX);
			let finalLink;

			// to check via the "www" method if normal HTTPS route fails - extracts out the full website chain from "www.xxx..." and strips away last index of "." or "," if exists
			if (match && Array.isArray(match) && typeof match[0] === 'string') {
				if (match[0].at(-1) === '.' || match[0].at(-1) === ',') {
					finalLink = match[0].slice(0, -1);
				} else {
					finalLink = match[0];
				}
			}
			if (finalLink) {
				wwwResult = await checkUrlExists(finalLink);
			}

			// if "www" check also fails, the URL is unreachable, push error
			if (!wwwResult) {
				errors.push('URL is unreachable, please check website source if it still exists.');
			}
		}
	}

	return { valid: errors.length === 0, errors, warnings, sourceVerified: false };
}

export { hasYearMLA, isValidMLA };
