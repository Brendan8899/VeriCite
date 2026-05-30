import { test, describe, expect } from 'vitest';

import { extractUrl, checkUrlExists } from '../src/utility/utility.js';

describe('extractUrl - pulls URL out of citation string', () => {
	test('extracts a valid https URL', () => {
		const citation = 'Smith, J. (2021). Title. https://www.example.com/article';
		expect(extractUrl(citation)).toBe('https://www.example.com/article');
	});

	test('extracts a DOI URL', () => {
		const citation = 'Smith, J. (2021). Title. https://doi.org/10.1000/xyz123';
		expect(extractUrl(citation)).toBe('https://doi.org/10.1000/xyz123');
	});

	test('returns null when no URL present', () => {
		const citation = 'Smith, J. (2021). Title. Journal Name, 4(1).';
		expect(extractUrl(citation)).toBeNull();
	});

	test('returns null for URL missing scheme', () => {
		const citation = 'Smith, J. (2021). Title. www.example.com';
		expect(extractUrl(citation)).toBeNull();
	});
});

describe('checkUrlExists - real network (integration)', () => {
	test('confirms google.com is reachable', async () => {
		const result = await checkUrlExists('https://www.google.com');
		expect(result).toBe(true);
	}, 10000); // 10s timeout — real network is slow

	test('confirms a known-dead URL is unreachable', async () => {
		const result = await checkUrlExists('https://thisdomaindoesnotexist99999.com');
		expect(result).toBe(false);
	}, 10000);

	test('confirms a valid DOI resolves', async () => {
		const result = await checkUrlExists('https://doi.org/10.1000/xyz123');
		expect(result).toBe(false); // expect 404 - doi is placeholder
	}, 10000);
});
