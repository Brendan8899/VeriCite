const { extractUrl, checkUrlExists, isValidUrl } = require('./verifyAPA');

// MLA year is a bare 4-digit number near the end, no parentheses
function hasYearMLA(citation) {
	const currentYear = new Date().getFullYear();

	// matches a bare year: ", 2021," or ", 2021."
	const yearRegex = /,\s(\d{4})[,\.]/;
	const match = citation.match(yearRegex);

	if (!match) return { found: false, error: 'Year is missing' };

	const year = parseInt(match[1]);
	if (year < 1800) return { found: false, error: 'Year is implausibly old' };
	if (year > currentYear) return { found: false, error: 'Year is in the future' };

	return { found: true, value: year };
}

async function isValidMLA(citation) {
	const errors = [];
	const warnings = [];

	const normalised = citation.replace(/\s+/g, ' ').trim();

	// --- 1. Author format check
	// MLA first author: "Lastname, Firstname" — full first name, not initials
	const authorRegex = /^([A-Z][a-zA-ZÀ-ÖØ-öø-ÿ\-]+,\s[A-Z][a-z]+|[A-Z][a-zA-Z\s]+\.)/;
	if (!authorRegex.test(normalised)) {
		errors.push('Author is missing or not correctly formatted');
	}

	// --- 2. Initials check — catches APA-style "Smith, J."
	const initialsRegex = /^[A-Z][a-zA-Z\-]+,\s[A-Z]\./;
	if (initialsRegex.test(normalised)) {
		errors.push('Author first name must be full, not abbreviated to initials');
	}

	// --- 3. Second author format — only first author inverted
	// "Smith, John, and Doe, Jane" is wrong — second should be "Jane Doe"
	const secondAuthorInvertedRegex = /,\sand\s[A-Z][a-z]+,\s[A-Z][a-z]+/;
	if (secondAuthorInvertedRegex.test(normalised)) {
		errors.push('Only the first author should be in Last, First format');
	}

	// --- 4. APA year position check — year in parens after author is APA, not MLA
	const apaYearRegex = /^.+?\.\s\(\d{4}\)/;
	if (apaYearRegex.test(normalised)) {
		errors.push('Year must not appear in parentheses after the author — this is APA format');
	}

	// --- 5. Article title in quotes check
	// Only applies if this looks like an article/chapter (has a container after the title)
	const hasQuotedTitle = /"[^"]+"/;
	const looksLikeArticle = /\.\s[A-Z][a-zA-Z\s]+,\svol\./; // has a journal container
	const looksLikeWebsite = /https?:\/\//;
	const looksLikeChapter = /edited\sby/;

	if (
		(looksLikeArticle.test(normalised) ||
			looksLikeWebsite.test(normalised) ||
			looksLikeChapter.test(normalised)) &&
		!hasQuotedTitle.test(normalised)
	) {
		errors.push('Article title must be enclosed in double quotation marks');
	}

	// --- 6. Journal-specific checks
	if (looksLikeArticle.test(normalised)) {
		if (!/vol\.\s\d+/.test(normalised)) {
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

	// --- 8. Website-specific checks
	if (looksLikeWebsite.test(normalised)) {
		// Must have a date — matches "15 Jan. 2021" or "2021" near URL
		const hasDate = /\d{1,2}\s[A-Z][a-z]+\.\s\d{4}|,\s\d{4},\s/.test(normalised);
		if (!hasDate) {
			errors.push('Web citation must include a publication or access date');
		}
	}

	// --- 9. Book-specific checks
	const looksLikeBook =
		!looksLikeArticle.test(normalised) &&
		!looksLikeWebsite.test(normalised) &&
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
	if (yearResult.warning) warnings.push(yearResult.warning);

	// --- 11. URL reachability
	const urlResult = await isValidUrl(normalised);
	if (urlResult.found && !urlResult.reachable) {
		errors.push(`URL appears unreachable: ${urlResult.url}`);
	}

	return { valid: errors.length === 0, errors, warnings };
}

module.exports = { hasYearMLA, isValidMLA };
