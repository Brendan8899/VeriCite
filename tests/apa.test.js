import { vi, test, describe, expect, beforeEach, afterEach } from 'vitest';

import { extractUrl, checkUrlExists, isValidUrl, hasYear, isValidAPA } from '../src/verifyAPA';

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

describe('hasYear', () => {
	test('finds a standard year', () => {
		expect(hasYear('Smith, J. (2021). Title. Journal.')).toMatchObject({
			found: true,
			value: 2021,
		});
	});

	test('finds year with month', () => {
		expect(hasYear('Smith, J. (2021, March 5). Title.')).toMatchObject({
			found: true,
			value: 2021,
		});
	});

	test('accepts n.d.', () => {
		expect(hasYear('Smith, J. (n.d.). Title.')).toMatchObject({ found: true, value: 'n.d.' });
	});

	test('rejects missing year', () => {
		expect(hasYear('Smith, J. Title. Journal.')).toMatchObject({ found: false });
	});

	test('rejects future year', () => {
		expect(hasYear('Smith, J. (2099). Title.')).toMatchObject({ found: false });
	});

	test('rejects implausibly old year', () => {
		expect(hasYear('Smith, J. (1599). Title.')).toMatchObject({ found: false });
	});
});

describe('isValidAPA - format validation', () => {
	beforeEach(() => {
		global.fetch = vi.fn().mockResolvedValue({ ok: true }); // assume URLs reachable by default
	});

	afterEach(() => vi.clearAllMocks());

	test('passes a well-formed journal article', async () => {
		const citation =
			'Smith, J. A., & Doe, B. (2021). Title of the article. Journal Name, 12(3), 45–67. https://doi.org/10.1000/xyz';
		const result = await isValidAPA(citation);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('fails when year is not after author', async () => {
		const citation = 'Smith, J. A. Title of article. (2021). Journal, 12(3).';
		const result = await isValidAPA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Year must appear immediately after the author');
	});

	test('fails when author uses full first name', async () => {
		const citation = 'Smith, John. (2021). Title. Journal.';
		const result = await isValidAPA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Author first name must be abbreviated to initials');
	});

	test('fails when URL is unreachable', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
		const citation = 'Smith, J. (2021). Title. Journal. https://dead-url.com/page';
		const result = await isValidAPA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('unreachable'))).toBe(true);
	});

	test('flags hyphen in page range as warning', async () => {
		const citation = 'Smith, J. (2021). Title. Journal, 4(1), 10-20.';
		const result = await isValidAPA(citation);
		expect(result.errors).toContain('Page range should use an em-dash (–) not a hyphen (-)');
	});

	test('returns multiple errors for badly broken citation', async () => {
		const citation = 'John Smith. Title only.';
		const result = await isValidAPA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(1);
	});
});
