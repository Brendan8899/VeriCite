import { vi, test, describe, expect, beforeEach, afterEach } from 'vitest';

import { hasYear, isValidAPA } from '../src/verifyAPA';

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
		expect(hasYear('Smith, J. (n.d.). Title.')).toMatchObject({ found: true, value: undefined });
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
