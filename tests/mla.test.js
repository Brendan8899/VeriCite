import { vi, test, describe, expect, beforeEach, afterEach } from 'vitest';

import { isValidMLA } from '../src/verifyMLA';

global.fetch = vi.fn();

beforeEach(() => {
	global.fetch.mockResolvedValue({ ok: true });
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('MLA author format', () => {
	test('passes full first name format', async () => {
		const citation = 'Smith, John. "Article Title." Journal, vol. 4, no. 1, 2021, pp. 10–20.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});

	test('fails when author uses initials like APA', async () => {
		const citation = 'Smith, J. "Article Title." Journal, vol. 4, no. 1, 2021, pp. 10–20.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Author first name must be full, not abbreviated to initials');
	});

	test('passes two authors — only first is inverted', async () => {
		const citation = 'Smith, John, and Jane Doe. "Title." Journal, vol. 4, no. 1, 2021, pp. 1–5.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});

	test('fails when second author is also inverted', async () => {
		const citation = 'Smith, John, and Doe, Jane. "Title." Journal, vol. 4, no. 1, 2021, pp. 1–5.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Only the first author should be in Last, First format');
	});

	test('passes three or more authors using et al.', async () => {
		const citation = 'Smith, John, et al. "Title." Journal, vol. 4, no. 1, 2021, pp. 1–5.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});

	test('passes corporate or org author', async () => {
		const citation = 'World Health Organization. "Report Title." WHO, 2020, www.who.int/example.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});
});

describe('MLA journal article format', () => {
	test('passes a well-formed journal article', async () => {
		const citation = 'Smith, John. "Article Title." Journal Name, vol. 12, no. 3, 2021, pp. 45–67.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});

	test('fails when article title is not in quotes', async () => {
		const citation = 'Smith, John. Article Title. Journal Name, vol. 12, no. 3, 2021, pp. 45–67.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Article title must be enclosed in double quotation marks');
	});

	test('fails when vol. is missing', async () => {
		const citation = 'Smith, John. "Article Title." Journal Name, no. 3, 2021, pp. 45–67.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Volume number (vol.) is missing');
	});

	test('fails when no. is missing', async () => {
		const citation = 'Smith, John. "Article Title." Journal Name, vol. 12, 2021, pp. 45–67.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Issue number (no.) is missing');
	});

	test('fails when page range is missing', async () => {
		const citation = 'Smith, John. "Article Title." Journal Name, vol. 12, no. 3, 2021.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Page range (pp.) is missing');
	});

	test('flags hyphen instead of em-dash in page range', async () => {
		const citation = 'Smith, John. "Article Title." Journal Name, vol. 12, no. 3, 2021, pp. 45-67.';
		const result = await isValidMLA(citation);
		expect(result.errors).toContain('Page range should use an em-dash (–) not a hyphen (-)');
	});

	test('fails when year appears right after author (APA style mistake)', async () => {
		const citation =
			'Smith, John. (2021). "Article Title." Journal Name, vol. 12, no. 3, pp. 45–67.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain(
			'Year must not appear in parentheses after the author — this is APA format',
		);
	});
});

describe('MLA website format', () => {
	test('passes a well-formed website citation', async () => {
		const citation =
			'Slat, Boyan. “Whales Likely Impacted by Great Pacific Garbage Patch.” The Ocean Cleanup, 10 Apr. 2019, www.theoceancleanup.com/updates/whales-likely-impacted-by-great-pacific-garbage-patch.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});

	test('fails when access date is missing for web source', async () => {
		const citation =
			'Slat, Boyan. “Whales Likely Impacted by Great Pacific Garbage Patch.” The Ocean Cleanup, www.theoceancleanup.com/updates/whales-likely-impacted-by-great-pacific-garbage-patch. Accessed 28 May.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Web citation must include a publication or access date');
	});

	test('fails when URL is missing for web source', async () => {
		const citation = 'Smith, John. "Page Title." Website Name, 15 Jan. 2021.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Web citation must include a URL');
	});

	test('flags unreachable URL', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
		const citation =
			'Smith, John. "Page Title." Website Name, 15 Jan. 2021, www.dead-url.com/page.';
		const result = await isValidMLA(citation);
		expect(result.errors.some((e) => e.includes('unreachable'))).toBe(true);
	});

	test('passes citation with Accessed date notation', async () => {
		const citation =
			'Smith, John. "Page Title." Website Name, 15 Jan. 2021, www.example.com. Accessed 20 May 2026.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});
});

describe('MLA book format', () => {
	test('passes a well-formed book citation', async () => {
		const citation = 'Smith, John. Book Title: A Subtitle. Publisher, 2021.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});

	test('passes a book with edition', async () => {
		const citation = 'Smith, John. Book Title. 3rd ed., Publisher, 2021.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});

	test('passes a book chapter with editor', async () => {
		const citation =
			'Smith, John. "Chapter Title." Book Title, edited by Jane Doe, Publisher, 2021, pp. 45–67.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});

	test('fails when publisher is missing', async () => {
		const citation = 'Smith, John. Book Title. 2021.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Publisher is missing');
	});

	test('fails when year is missing entirely', async () => {
		const citation = 'Smith, John. Book Title. Publisher.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Year is missing');
	});
});

describe('MLA edge cases', () => {
	test('handles citation split across multiple lines', async () => {
		const citation = `Smith, John. "Article Title." Journal Name,
    vol. 12, no. 3, 2021, pp. 45–67.`;
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});

	test('handles unicode characters in author name', async () => {
		const citation = 'Müller, Hans. "Article Title." Journal, vol. 4, no. 1, 2021, pp. 1–10.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(true);
	});

	test('returns multiple errors for badly broken citation', async () => {
		const citation = 'J. Smith. Article Title. 2021.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(1);
	});

	test('does not confuse MLA with APA format', async () => {
		const citation = 'Smith, J. A. (2021). Title of article. Journal Name, 12(3), 45–67.';
		const result = await isValidMLA(citation);
		expect(result.valid).toBe(false);
	});
});
