import { type } from 'node:os';
import { isValidUrl, checkUrlExists } from '../utility/utility.js';

// Regex

// matches a bare year: ", 2021," or ", 2021."
const yearRegex = /,?\s(\d{4})[,.]/;

// Must have a date — matches "15 Jan. 2021" or "Accessed 20 May 2026."
const publicationDateRegex = /\b\d{1,2}\s[A-Z][a-z]+\.\s\d{4}\b/;
const accessedDateRegex = /\bAccessed\s\d{1,2}\s[A-Z][a-z]+(?:\s\d{4})?\.?/;
const urlRegex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/;

// MLA first author: "Lastname, Firstname" — full first name, not initials
const authorRegex = /^([A-Z][a-zA-ZÀ-ÖØ-öø-ÿ-]+,\s[A-Z][a-z]+|[A-Z][a-zA-Z\s]+\.)/;

const initialsRegex = /^[A-Z][a-zA-Z-]+,\s[A-Z]\./;

const secondAuthorInvertedRegex = /,\sand\s[A-Z][a-z]+,\s[A-Z][a-z]+/;

const apaYearRegex = /^.+?\.\s\(\d{4}\)/;

// Only applies if this looks like an article/chapter (has a container after the title)
// Accept both straight quotes and Unicode smart quotes
const hasQuotedTitle = /["“”][^"“”]+["“”]/;

const looksLikeJournalCitation = /\."?\s[A-Z][a-zA-Z\s]+,\s(?:vol\.|no\.|pp\.)/; //check for existence of format: { "Article." Journal Name, vol. xx, year, pp. pg-pg. }

const looksLikeChapter = /edited\sby/;

const isVolTrack = /vol\.\s\d+/;

const wwwRegex = /www\.[a-zA-Z\p{P}]+/u;

function looksLikeWebsiteCitation(normalised) {
	return (
		hasQuotedTitle.test(normalised) &&
		(urlRegex.test(normalised) || publicationDateRegex.test(normalised) || accessedDateRegex.test(normalised))
	);
}

// MLA year is a bare 4-digit number near the end, no parentheses
function hasYearMLA(citation) {
	const normalised = citation.replace(/\s+/g, ' ').trim();
	
	const currentYear = new Date().getFullYear();
	const errors = [];
	const warnings = [];

	const match = citation.match(yearRegex);

	// --- Website-specific checks
	if (looksLikeWebsiteCitation(normalised)) {
		const hasPublicationDate = publicationDateRegex.test(normalised);
		const hasAccessDate = accessedDateRegex.test(normalised);
		const hasUrl = urlRegex.test(normalised);

		if (!hasUrl) {
			errors.push('Web citation must include a URL');
		}

		if (hasAccessDate && !hasPublicationDate) {
			errors.push('Web citation must include a publication or access date');
			warnings.push(
				'Year of citation not detected. Do check if the citation provides one and update if possible.',
			);
			return { found: false, error: 'Year is missing', warnings, errors };
		}
	}

	if (!match) return { found: false, error: 'Year is missing', warnings, errors };

	const year = parseInt(match[1]);
	if (year < 1800) return { found: false, error: 'Year is implausibly old', warnings, errors };
	if (year > currentYear) return { found: false, error: 'Year is in the future', warnings, errors };

	return { found: true, value: year, warnings, errors };
}

async function isValidMLA(citation) {
	const normalised = citation.replace(/\s+/g, ' ').trim();
	const errors = [];
	const warnings = [];

	// --- 1. Author format check
	if (!authorRegex.test(normalised)) {
		errors.push('Author is missing or not correctly formatted');
	}

	// --- 2. Initials check — catches APA-style "Smith, J."
	if (initialsRegex.test(normalised)) {
		errors.push('Author first name must be full, not abbreviated to initials');
	}

	// --- 3. Second author format — only first author inverted
	// "Smith, John, and Doe, Jane" is wrong — second should be "Jane Doe"
	if (secondAuthorInvertedRegex.test(normalised)) {
		errors.push('Only the first author should be in Last, First format');
	}

	// --- 4. APA year position check — year in parens after author is APA, not MLA

	if (apaYearRegex.test(normalised)) {
		errors.push('Year must not appear in parentheses after the author — this is APA format');
	}

	// --- 5. Article title in quotes check
	if (
		(looksLikeJournalCitation.test(normalised) ||
			urlRegex.test(normalised) ||
			looksLikeChapter.test(normalised)) &&
		!hasQuotedTitle.test(normalised)
	) {
		errors.push('Article title must be enclosed in double quotation marks');
	}

	// --- 6. Journal-specific checks
	if (looksLikeJournalCitation.test(normalised)) {
		if (!isVolTrack.test(normalised)) {
			errors.push('Volume number (vol.) is missing');
		}
		if (!/no\.\s\d+/.test(normalised)) {
			errors.push('Issue number (no.) is missing');
		}
		if (!/pp\.\s\d+/.test(normalised)) {
			errors.push('Page range (pp.) is missing');
		}
	}

	// --- 7. Page range em-dash check (applies to all source types with pages)
	const hyphenPageRange = /pp\.\s\d+-\d+/;
	if (hyphenPageRange.test(normalised)) {
		errors.push('Page range should use an em-dash (–) not a hyphen (-)');
	}
	// Must have a date — matches "15 Jan. 2021" or "2021" near URL
	const hasDateRegex = /Accessed\s\d{1,2}?\s[A-Za-z]+\s\d{4}\./;
	// --- 8. Website-specific checks
	if (looksLikeWebsiteCitation(normalised)) {
		const hasPublicationDate = publicationDateRegex.test(normalised);
		const hasAccessDate = accessedDateRegex.test(normalised);
		const hasUrl = urlRegex.test(normalised);

		if (!hasUrl) {
			errors.push('Web citation must include a URL');
		}

		if (hasAccessDate && !hasPublicationDate) {
			errors.push('Web citation must include a publication or access date');
		}
	}

	// --- 9. Book-specific checks
	const looksLikeBook =
		!looksLikeJournalCitation.test(normalised) &&
		!looksLikeWebsiteCitation(normalised) &&
		!looksLikeChapter.test(normalised);

	if (looksLikeBook) {
		// Book needs a publisher before the year
		// Pattern: "Publisher, 2021."
		const publisherYearRegex = /[A-Z][a-zA-Z\s]+,\s\d{4}\./;
		if (!publisherYearRegex.test(normalised)) {
			errors.push('Publisher is missing');
		}
	}

	// --- 10. Year validity (all source types)
	const yearResult = hasYearMLA(normalised);
	if (!yearResult.found) {
		errors.push(yearResult.error);
	}
	if (yearResult.errors) errors.push(...yearResult.errors);
	if (yearResult.warning) warnings.push(yearResult.warning);
	if (yearResult.warnings) warnings.push(...yearResult.warnings);

	// --- 11. URL reachability
	const httpsResult = await isValidUrl(normalised);
	// check if https:// is found in link 

	let wwwResult;

	// check if URL can be reached via normal HTTPS check route in isValidURL
	if (!httpsResult.found || !httpsResult.reachable){
		let match = citation.match(wwwRegex);
		let finalLink;

		// to check via the "www" method if normal HTTPS route fails - extracts out the full website chain from "www.xxx..." and strips away last index of "." or "," if exists
		if (match && Array.isArray(match) && match[0] instanceof String) {
			if (match[0].at(-1) === "." || match[0].at(-1) === ",") {
				finalLink = match[0].slice(0, -1);
			}
		}
		wwwResult = await checkUrlExists(normalised);

		// if "www" check also fails, the URL is wholly unreachable, push error
		if (!wwwResult) {
			errors.push("URL is unreachable, please check website source if it still exists.");
		}
	}
	return { valid: errors.length === 0, errors, warnings };
}




async function isValidMLAcopy(citation) {
	return isValidMLA(citation);
}

module.exports = { hasYearMLA, isValidMLA, isValidMLAcopy };