import { isValidUrl, normalizeWhitespace } from "../utility.js";

export async function isValidIEEE(citation) {
    // Implementation for IEE Citation Validation

    // Normalize whitespace in the citation
    citation = normalizeWhitespace(citation);

    // 1. Check if the citation starts with an index number in square brackets, e.g. [1]
    const indexNumberRegex = /^\[\d+\]/;
    if (!indexNumberRegex.test(citation)) {
        return { valid: false, error: "Citation must start with an index number in square brackets, e.g. [1]" };
    }

    let errors = [];
    let warnings = [];

    // 2. Check for the presence of author names, which should be in the format "F. M. Lastname" of "F. Lastname" after the index number in square brackets
    const authorRegex = /^\[\d+\]\s([A-Z]\.\s)+[A-Z][a-zA-ZÀ-ÖØ-öø-ÿ\-]+(,\s[A-Z]\.\s?[A-Z]\.)?/;
    // Check for the presence of organization author names after the index number in square brackets e.g. [1] World Health Organization.
    const orgAuthorRegex = /^\[\d+\]\s[A-Z][a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]*(\s[a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]+)*\./;

    // Check for the presence of no space in between index number and author names e.g. [1]Smith, J. or [1]World Health Organization.
    const indexNumberNoSpaceAuthorRegex = /^\[\d+\]([A-Z]\.\s)?[A-Z][a-zA-ZÀ-ÖØ-öø-ÿ\-]+(,\s[A-Z]\.\s?[A-Z]\.)?/;
    const indexNumberNoSpaceOrgAuthorRegex = /^\[\d+\][A-Z][a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]*(\s[a-zA-Z0-9À-ÖØ-öø-ÿ&'’.,-]+)*\./;

    if (indexNumberNoSpaceAuthorRegex.test(citation) || indexNumberNoSpaceOrgAuthorRegex.test(citation)) {
        errors.push("There should be a space between the index number and the author names. Please check if the citation is complete.");
    }

    else if (!authorRegex.test(citation) && !orgAuthorRegex.test(citation)) {
        warnings.push("Author names may be missing or not in the correct format (F. M. Lastname). Please check if the citation is complete.");
    }

    // 3. Check for the presence of a title, which should be enclosed in quotation marks
    const quotedTitleRegex = /[“"][^”"]+[”"]/;
    if (!quotedTitleRegex.test(citation)) {
        warnings.push("Title of the work is missing or not enclosed in quotation marks. Please check if the citation is complete.");
    }

    // 4. Year should be in the form 2002. or 2002, and it should not be enclosed in parentheses
    const yearRegex = /\b(18|19|20)\d{2}\b/;
    if (!yearRegex.test(citation)) {
        errors.push("Year of publication could be missing. Please check if the citation is complete.");
    }

    // 5. URL Validity Check: If a URL is present in the citation, check if it is reachable.
    const urlResult = await isValidUrl(citation);
    if (urlResult.found && !urlResult.reachable) {
        errors.push(`URL appears unreachable: ${urlResult.url}. Please check if the citation is complete.`);
    }

    // 6. If URL is found, Accessed Date should also be present in the format "[Accessed Month. Day, Year] or [Accessed: Month. Day, Year]"
    const accessedDateRegex = /\[Accessed:?\s[A-Za-z]+\.?\s\d{1,2},\s\d{4}\]/;
    if (urlResult.found && !accessedDateRegex.test(citation)) {
        errors.push("Accessed date is missing or not in the correct format (e.g. [Accessed Month. Day, Year] or [Accessed: Month. Day, Year]). Please check if the citation is complete.");
    }

    return { valid: errors.length === 0, errors, warnings };
}