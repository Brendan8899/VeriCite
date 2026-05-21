function extractUrl(citation) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const match = citation.match(urlRegex);
  return match ? match[0] : null;
}

async function checkUrlExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' }); //return status only
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function isValidUrl(citation) {
  const url = extractUrl(citation);
  if (!url) return { found: false, reachable: false };
  const reachable = await checkUrlExists(url);
  return { found: true, url, reachable };
}

function hasYear(citation) {
  const currentYear = new Date().getFullYear();

  // matches (2021) or (2021, March 5) or (n.d.)
  const yearRegex = /\((\d{4}|n\.d\.)(,\s[^)]+)?\)/;
  const match = citation.match(yearRegex);

  // check if year is missing
  if (!match) return { found: false, error: 'Year is missing or not in parentheses' };

  // check if year is written as 'n.d.'
  if (match[1] === 'n.d.') return { found: true, value: 'n.d.', warning: 'No date — unverifiable' };

  // check if year is before 1800 or in the future
  const year = parseInt(match[1]);
  if (year < 1800) return { found: false, error: 'Year is implausibly old' };
  if (year > currentYear) return { found: false, error: 'Year is in the future' };

  return { found: true, value: year };
}

async function isValidAPA(citation) {
  const errors = [];
  const warnings = [];

  const normalised = citation.replace(/\s+/g, ' ').trim();

  // Author check
  const authorRegex = /^([A-Z][a-zA-ZÀ-ÖØ-öø-ÿ\-]+,\s[A-Z]\.|[A-Z][a-zA-Z\s]+\.)/;
  if (!authorRegex.test(normalised)) errors.push('Author is missing or not correctly formatted');

  // Full first name check
  const fullFirstNameRegex = /^[A-Z][a-z]+,\s[A-Z][a-z]+/;
  if (fullFirstNameRegex.test(normalised)) errors.push('Author first name must be abbreviated to initials');

  const afterAuthors = normalised.replace(/^([A-Z][a-zA-ZÀ-ÖØ-öø-ÿ\-]+,\s[A-Z]\.(\s[A-Z]\.)?)(,\s(&\s)?[A-Z][a-zA-ZÀ-ÖØ-öø-ÿ\-]+,\s[A-Z]\.(\s[A-Z]\.)?)*,?\s/, '');
  if (!/^\((\d{4}|n\.d\.)/.test(afterAuthors)) {
    errors.push('Year must appear immediately after the author');
  }

  // Year validity check
  const yearResult = hasYear(normalised);
  if (!yearResult.found) errors.push(yearResult.error);
  if (yearResult.warning) warnings.push(yearResult.warning);

  // Title check
  const titleRegex = /\((\d{4}|n\.d\.)[^)]*\)\.\s.+?\./;
  if (!titleRegex.test(normalised)) errors.push('Title is missing');

  // Page range check
  const hyphenPageRange = /,\s\d+-\d+/;
  if (hyphenPageRange.test(normalised)) errors.push('Page range should use an em-dash (–) not a hyphen (-)');

  // URL check
  const urlResult = await isValidUrl(normalised);
  if (urlResult.found && !urlResult.reachable) errors.push(`URL appears unreachable: ${urlResult.url}`);

  return { valid: errors.length === 0, errors, warnings };
}

module.exports = { extractUrl, checkUrlExists, isValidUrl, hasYear, isValidAPA };