import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	includesComparable,
	normalizeForCompare,
	normalizeIsbn,
	scoreBookMatch,
	transformGoogleBookItem,
	verifySource,
} from '../src/sourceVerificationEngine/sourceVerification.js';

describe('normalizeForCompare - prepares free text for matching', () => {
	// Decomposes Accented Characters with NKFD
	// Replaces the Accents with Nothing
	// Replaces the Punctuation with Spaces
	// Trim preceding and proceeding spaces
	test('lowercases text and collapses punctuation to spaces', () => {
		expect(normalizeForCompare('Clean-Code: A Handbooké!')).toBe('clean code a handbooke');
	});

	test('turns empty string into an empty string', () => {
		expect(normalizeForCompare('')).toBe('');
	});
});

describe('includesComparable: compares normalized text in either direction', () => {
	test('matches when the target title as 1st argument matches longer citation in 2nd argument', () => {
		expect(
			includesComparable(
				'Martin, R. C. (2008). Clean Code: A Handbook of Agile Software Craftsmanship.',
				'Clean Code',
			),
		).toBe(true);
	});

	test('matches when the target title as 2nd argument matches longer citation in 1st argument', () => {
		expect(
			includesComparable(
				'Clean Code',
				'Martin, R. C. (2008). Clean Code: A Handbook of Agile Software Craftsmanship.',
			),
		).toBe(true);
	});

	test('matches despite casing and punctuation differences', () => {
		expect(includesComparable('Clean Code', 'clean-code')).toBe(true);
	});

	test('does not match when either side normalizes to empty text', () => {
		expect(includesComparable('', 'Clean Code')).toBe(false);
		expect(includesComparable('Clean Code', undefined)).toBe(false);
	});
});

describe('normalizeIsbn: standardizes ISBN values', () => {
	test('removes hyphens and whitespace while preserving ISBN X check digits', () => {
		expect(normalizeIsbn('0-306 40615-x')).toBe('030640615X');
	});
});

describe('transformGoogleBookItem: extracts the fields used for scoring', () => {
	test('maps a complete Google Books item into the internal book shape', () => {
		const rawBook = {
			volumeInfo: {
				title: 'Clean Code',
				authors: ['Robert C. Martin'],
				publishedDate: '2008',
				industryIdentifiers: [
					{ type: 'ISBN_10', identifier: '0132350882' },
					{ type: 'ISBN_13', identifier: '9780132350884' },
					{ type: 'OTHER', identifier: 'ignored-value' },
				],
			},
		};

		expect(transformGoogleBookItem(rawBook)).toEqual({
			title: 'Clean Code',
			authors: ['Robert C. Martin'],
			publishedDate: '2008',
			isbn: ['0132350882', '9780132350884'],
		});
	});

	test('returns only available fields for sparse or malformed Google Books items', () => {
		expect(transformGoogleBookItem({ volumeInfo: { title: 'Only a Title' } })).toEqual({
			title: 'Only a Title',
			authors: [],
			isbn: [],
			publishedDate: undefined,
		});
	});
});

describe('scoreBookMatch: ranks transformed Google Books results', () => {
	test('adds weighted points for ISBN, title, authors, and publication year matches', () => {
		const citation =
			'Robert C. Martin (2008). Clean Code: A Handbook of Agile Software Craftsmanship. ISBN 9780132350884.';
		const transformedBook = {
			title: 'Clean Code',
			authors: ['Robert C. Martin', 'Unmatched Contributor'],
			publishedDate: '2008',
			isbn: ['9780132350884'],
		};

		// 4 Points from the ISBN Number Matching, 2 Points from the Title Matching, 1 Point from 1 Author Matching, 1 Point from the Same Year
		expect(scoreBookMatch(citation, transformedBook)).toBe(8);
	});

	test('returns zero when no identifying book details match the citation', () => {
		const citation = 'Completely different citation text.';
		const transformedBook = {
			title: 'Clean Code',
			authors: ['Robert C. Martin'],
			publishedDate: '2008',
			isbn: ['9780132350884'],
		};

		expect(scoreBookMatch(citation, transformedBook)).toBe(0);
	});
});

describe('verifySource: verifies citations through Google Books', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('returns a valid result and sorted matches when Google Books provides a strong match', async () => {
		const citation =
			'Robert C. Martin (2008). Clean Code: A Handbook of Agile Software Craftsmanship. ISBN 9780132350884.';
		const googleBooksPayload = {
			items: [
				{
					volumeInfo: {
						title: 'Unrelated Book',
						authors: ['Someone Else'],
						publishedDate: '1999',
					},
				},
				{
					volumeInfo: {
						title: 'Clean Code',
						authors: ['Robert C. Martin'],
						publishedDate: '2008',
						industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780132350884' }],
					},
				},
			],
		};
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue(googleBooksPayload),
		});
		global.fetch = fetchMock;

		const result = await verifySource(citation, 'test-token');

		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('https://www.googleapis.com/books/v1/volumes?q='),
			{
				method: 'GET',
				headers: {
					Authorization: 'Bearer test-token',
				},
			},
		);
		expect(result.ok).toBe(true);
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
		expect(result.bestMatch).toMatchObject({
			title: 'Clean Code',
			score: 8,
		});
		expect(result.matches.map((match) => match.title)).toEqual(['Clean Code', 'Unrelated Book']);
	});

	test('returns an invalid warning when the best available match scores below the threshold', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				items: [
					{
						volumeInfo: {
							title: 'Clean Code',
						},
					},
				],
			}),
		});

		const result = await verifySource('A citation that mentions Clean Code only.', 'test-token');

		// toMatchObject only checks the fields tjhat are expected, there could be more fields in results
		expect(result).toMatchObject({
			ok: true,
			valid: false,
			errors: [],
			warnings: ['Book found may not be matching. Please verify if reference exists.'],
		});
		expect(result.bestMatch).toMatchObject({
			title: 'Clean Code',
			score: 2,
		});
	});

	test('returns a no-match error when Google Books responds without items', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ items: [] }),
		});

		const result = await verifySource('Unknown citation.', 'test-token');

		expect(result).toEqual({
			ok: true,
			valid: false,
			bestMatch: undefined,
			matches: [],
			errors: ['No matching book found in Google Books'],
			warnings: [],
		});
	});

	test('returns a request error when the Google Books API response is not ok', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 503,
		});

		const result = await verifySource('Any citation.', 'test-token');

		expect(result).toEqual({
			ok: false,
			valid: false,
			bestMatch: undefined,
			matches: [],
			errors: ['Google Books API request failed with status 503'],
			warnings: [],
		});
	});
});
