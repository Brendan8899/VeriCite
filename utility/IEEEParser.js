import IEEE_ALL_REGEX from '../src/verifyIEEE.js';

const { IEEE_INDEX_NUMBER_REGEX } = IEEE_ALL_REGEX;
// IEEEParser to reconstruct correct IEEE references in case the user has newline characters in the same references
// Google Docs API will return them as seperate paragraphs
// Thus, we have to reconstruct by using the index number to delimit one reference from another

// Input would be an array of paragraphs, check if they belong to the same reference and combine if they are
export function reconstituteIEEEReferences(splitReferences) {
	// If there are no references, return empty array
	let current = null;
	let result = [];
	if (splitReferences.length === 0) {
		return [];
	} else {
		// Else assign the 1st element and start merging
		current = splitReferences[0];
	}
	for (let i = 1; i < splitReferences.length; i += 1) {
		// Index Number for IEEE Citation found, it is a new reference
		if (IEEE_INDEX_NUMBER_REGEX.test(splitReferences[i])) {
			result.push(current);
			current = splitReferences[i];
		}
		// else its just continuation of the current IEEE Reference
		else {
			current += ' ' + splitReferences[i];
		}
	}
	return result;
}
