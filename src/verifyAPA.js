import { isValidUrl, normalizeWhitespace } from '../utility/utility.js';

// Check if the reference has a year in parentheses and if its a valid year or no date
export function hasYear(citation) {
	// Get the current year in the system to check for future years in the citation
	const currentYear = new Date().getFullYear();

	// matches (2021) or (2021, March 5) or (n.d.)
	// Check if theres open braces, followed by either 4 digits or 'n.d.', optionally followed by a comma and more text, then a closing brace
	const yearRegex = /\((\d{4}|n\.d\.)(,\s[^)]+)?\)/;
	const match = citation.match(yearRegex);

	// check if year is missing
	if (!match) return { found: false, error: 'Year is missing or not in parentheses' };

	// check if year is written as 'n.d.'
	if (match[1] === 'n.d.') return { found: true, value: 'n.d.', warning: 'No date — unverifiable' };

	// check if year is before 1800 or in the future
	const year = parseInt(match[1]);
	if (year < 1800) return { found: false, error: 'Year is very old' };
	if (year > currentYear) return { found: false, error: 'Year is in the future' };

	return { found: true, value: year };
}

export async function isValidAPA(citation) {
	const errors = [];
	const warnings = [];
	// Replace multiple consecutive whitespace character with a single space and trim Leading/trailing whitespace
	const normalised = normalizeWhitespace(citation);

	// Check if the Author Exists and is in the correct format (Lastname, F. M.)
	// [a-zA-ZÀ-ÖØ-öø-ÿ\-] represents the set of all English and European Language Characters, including accented characters and hyphenated names
	const authorRegex = /^([A-Z][a-zA-ZÀ-ÖØ-öø-ÿ\-]+,\s[A-Z]\.(\s[A-Z]\.)?)/;
	// Regex for Organization Names, e.g. "World Health Organization" or "Smithsonian Institution"
	const orgAuthorRegex = /^[A-Z][a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]*(\s[a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]+)*\./;
	if (!authorRegex.test(normalised) && !orgAuthorRegex.test(normalised))
		errors.push('Author or Organization Author is missing or not correctly formatted');

	const yearAfterAuthorRegex =
		/[A-Z][a-zA-ZÀ-ÖØ-öø-ÿ-]+,\s[A-Z]\.(\s[A-Z]\.)?\s\((\d{4}|n\.d\.)(,\s[^)]+)?\)/;
	// Regex for Organization Names and Year in parentheses, e.g. (World Health Organization, 2021) or (World Health Organization, n.d.)
	const yearAfterOrgAuthor =
		/[A-Z][a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]*(\s[a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]+)*\.\s\((\d{4}|n\.d\.)(,\s[^)]+)?\)/;
	if (!yearAfterAuthorRegex.test(normalised) && !yearAfterOrgAuthor.test(normalised))
		errors.push('Year must appear immediately after the author');

	// Year validity check
	const yearResult = hasYear(normalised);
	if (!yearResult.found) errors.push(yearResult.error);
	if (yearResult.warning) warnings.push(yearResult.warning);

	// Title check
	const titleRegex = /\((\d{4}|n\.d\.)[^)]*\)\.\s.+?\./;
	if (!titleRegex.test(normalised)) errors.push('Title is missing');

	// Page range check
	const hyphenPageRange = /,\s\d+-\d+/;
	if (hyphenPageRange.test(normalised))
		errors.push('Page range should use an em-dash (–) not a hyphen (-)');

	// URL check
	const urlResult = await isValidUrl(normalised);
	if (urlResult.found && !urlResult.reachable)
		errors.push(`URL appears unreachable: ${urlResult.url}`);

	return { valid: errors.length === 0, errors, warnings };
}
