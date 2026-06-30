import { describe, test, expect } from 'vitest';

import { MLA_ALL_REGEX } from '../src/verifyMLA';

const {
	YEAR_REGEX,
	PUBLICATION_DATE_REGEX,
	ACCESSED_DATE_REGEX,
	URL_REGEX,
	AUTHOR_REGEX,
	INITIALS_REGEX,
	SECOND_AUTHOR_INVERTED_REGEX,
	APA_YEAR_REGEX,
	HAS_QUOTED_TITLE_REGEX,
	JOURNAL_CITATION_REGEX,
	CHAPTER_REGEX,
	IS_VOL_TRACK_REGEX,
	WWW_REGEX,
	ISSUE_NUMBER_REGEX,
	PAGE_RANGE_REGEX,
	HYPHEN_PAGE_RANGE_REGEX,
} = MLA_ALL_REGEX;

describe('MLA regex tests', () => {
	test('YEAR_REGEX finds bare year near end', () => {
		const cases = ['Smith, John. "Article Title." Journal, vol. 4, no. 1, 2021, pp. 10–20.'];

		for (const c of cases) expect(YEAR_REGEX.test(c)).toBe(true);
	});

	test('PUBLICATION_DATE_REGEX matches dates like 15 Jan. 2021', () => {
		expect(PUBLICATION_DATE_REGEX.test('10 Apr. 2020')).toBe(true);
		expect(PUBLICATION_DATE_REGEX.test('5 July 1999')).toBe(true);
		expect(PUBLICATION_DATE_REGEX.test('April 5, 1999')).toBe(false);
	});

	test('ACCESSED_DATE_REGEX matches Accessed 20 May 2026.', () => {
		expect(ACCESSED_DATE_REGEX.test('Accessed 20 May 2026.')).toBe(true);
		expect(ACCESSED_DATE_REGEX.test('Accessed 28 May')).toBe(false);
	});

	test('URL_REGEX matches typical urls', () => {
		const valid = ['https://example.com/page', 'http://example.org', 'www.example.net/path'];
		for (const u of valid) expect(URL_REGEX.test(u)).toBe(true);
	});

	test('AUTHOR_REGEX accepts Lastname, Firstname', () => {
		expect(AUTHOR_REGEX.test('Smith, John.')).toBe(true);
		expect(AUTHOR_REGEX.test('Müller, Hans.')).toBe(true);
		expect(AUTHOR_REGEX.test('Smith, J.')).toBe(false);
	});

	test('INITIALS_REGEX matches Smith, J.', () => {
		expect(INITIALS_REGEX.test('Smith, J.')).toBe(true);
		expect(INITIALS_REGEX.test('Smith, John.')).toBe(false);
	});

	test('SECOND_AUTHOR_INVERTED_REGEX detects inverted second author', () => {
		expect(SECOND_AUTHOR_INVERTED_REGEX.test('Smith, John, and Doe, Jane')).toBe(true);
		expect(SECOND_AUTHOR_INVERTED_REGEX.test('Smith, John, and Jane Doe')).toBe(false);
	});

	test('APA_YEAR_REGEX detects APA-style paren year after author', () => {
		expect(APA_YEAR_REGEX.test('Smith, J. (2021).')).toBe(true);
		expect(APA_YEAR_REGEX.test('Smith, John. 2021.')).toBe(false);
	});

	test('HAS_QUOTED_TITLE_REGEX matches quoted titles', () => {
		expect(HAS_QUOTED_TITLE_REGEX.test('"Article Title."')).toBe(true);
		expect(HAS_QUOTED_TITLE_REGEX.test('“Unicode Title.”')).toBe(true);
		expect(HAS_QUOTED_TITLE_REGEX.test('No quotes')).toBe(false);
	});

	test('JOURNAL_CITATION_REGEX and related volume/issue/page regexes', () => {
		const citation = '"Article." Journal Name, vol. 12, no. 3, 2021, pp. 45–67.';
		expect(JOURNAL_CITATION_REGEX.test(citation)).toBe(true);
		expect(IS_VOL_TRACK_REGEX.test(citation)).toBe(true);
		expect(ISSUE_NUMBER_REGEX.test(citation)).toBe(true);
		expect(PAGE_RANGE_REGEX.test(citation)).toBe(true);
	});

	test('CHAPTER_REGEX matches edited by', () => {
		expect(CHAPTER_REGEX.test('edited by John Smith')).toBe(true);
	});

	test('WWW_REGEX finds www prefix', () => {
		expect(WWW_REGEX.test('www.example.com')).toBe(true);
	});

	test('HYPHEN_PAGE_RANGE_REGEX detects hyphen ranges and not en-dash', () => {
		expect(HYPHEN_PAGE_RANGE_REGEX.test('pp. 10-20')).toBe(true);
		expect(HYPHEN_PAGE_RANGE_REGEX.test('pp. 10–20')).toBe(false);
	});
});
