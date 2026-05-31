import { isValidUrl } from './utility/utility.js';
import { FormatValidationResult, HasYearResult } from './types.js';

// matches (2021) or (2021, March 5) or (n.d.)
	// Check if theres open braces, followed by either 4 digits or 'n.d.', optionally followed by a comma and more text, then a closing brace
const YEAR_REGEX = /\((\d{4}|n\.d\.)(,\s[^)]+)?\)/;

// Check if the Author Exists and is in the correct format (Lastname, F. M.)
// [a-zA-ZÀ-ÖØ-öø-ÿ\-] represents the set of all English and European Language Characters, including accented characters and hyphenated names
const AUTHOR_REGEX = /^([A-Z][a-zA-ZÀ-ÖØ-öø-ÿ-]+,\s[A-Z]\.(\s[A-Z]\.)?)/;
// Regex for Organization Names, e.g. "World Health Organization" or "Smithsonian Institution"
const ORG_AUTHOR_REGEX = /^[A-Z][a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]*(\s[a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]+)*\./;

const YEAR_AFTER_AUTHOR_REGEX =
	/[A-Z][a-zA-ZÀ-ÖØ-öø-ÿ-]+,\s[A-Z]\.(\s[A-Z]\.)?\s\((\d{4}|n\.d\.)(,\s[^)]+)?\)/;

// Regex for Organization Names and Year in parentheses, e.g. World Health Organization. (2021) or World Health Organization. (n.d.)
const YEAR_AFTER_ORG_AUTHOR_REGEX =
	/[A-Z][a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]*(\s[a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]+)*\.\s\((\d{4}|n\.d\.)(,\s[^)]+)?\)/;

// Page range check
const HYPHEN_PAGE_RANGE_REGEX = /,\s\d+-\d+/;

export const APA_ALL_REGEX = {
	YEAR_REGEX,
	AUTHOR_REGEX,
	ORG_AUTHOR_REGEX,
	YEAR_AFTER_AUTHOR_REGEX,
	YEAR_AFTER_ORG_AUTHOR_REGEX,
	HYPHEN_PAGE_RANGE_REGEX
}

// Check if the reference has a year in parentheses and if its a valid year or no date
export function hasYear(citation: string): HasYearResult {
	// Get the current year in the system to check for future years in the citation
	const currentYear = new Date().getFullYear();

	const match = citation.match(YEAR_REGEX);

	// check if year is missing
	if (!match) return { found: false, value: undefined, errors: ['Year is missing or not in parentheses'], warning: [] };

	// check if year is written as 'n.d.'
	if (match[1] === 'n.d.') return { found: true, value: undefined, errors: [], warning: ['No date — unverifiable'] };

	// check if year is before 1800 or in the future
	const year = parseInt(match[1]);
	if (year < 1800) return { found: false, value: year, errors: ['Year is very old'], warning: [] };
	if (year > currentYear) return { found: false, value: year, errors: ['Year is in the future'], warning: [] };

	return { found: true, value: year, errors: [], warning: [] };
}

export async function isValidAPA(citation: string): Promise<FormatValidationResult> {
	const errors: Array<string> = [];
	const warnings: Array<string> = [];

	if (!AUTHOR_REGEX.test(citation) && !ORG_AUTHOR_REGEX.test(citation))
		errors.push('Author or Organization Author is missing or not correctly formatted');

	if (AUTHOR_REGEX.test(citation)) {
		if (!YEAR_AFTER_AUTHOR_REGEX.test(citation)) {
			errors.push('Year must appear immediately after the author');
		}
	}

	if (ORG_AUTHOR_REGEX.test(citation)) {
		if (!YEAR_AFTER_ORG_AUTHOR_REGEX.test(citation)) {
			errors.push('Year must appear immediately after the author');
		}
	}

	// Year validity check
	const yearResult: HasYearResult = hasYear(citation);
	if (!yearResult.found && yearResult.errors) {
		errors.concat(yearResult.errors);
	}
	if (yearResult.warning) warnings.concat(yearResult.warning);

	// Title check
	const titleRegex = /\((\d{4}|n\.d\.)[^)]*\)\.\s.+?\./;
	if (!titleRegex.test(citation)) errors.push('Title is missing');

	if (HYPHEN_PAGE_RANGE_REGEX.test(citation))
		errors.push('Page range should use an em-dash (–) not a hyphen (-)');

	// URL check
	const urlResult = await isValidUrl(citation);
	if (urlResult.found && !urlResult.reachable)
		errors.push(`URL appears unreachable: ${urlResult.url}`);

	return { valid: errors.length === 0, errors, warnings, sourceVerified: false };
}
