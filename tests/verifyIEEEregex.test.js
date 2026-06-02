import { describe, test, expect } from 'vitest';

import { IEEE_ALL_REGEX } from '../src/verifyIEEE';

const {
	IEEE_INDEX_NUMBER_REGEX,
	IEEE_AUTHOR_INDEX_REGEX,
	IEEE_ORG_AUTHOR_INDEX_REGEX,
	IEEE_INDEX_NUMBER_NO_SPACE_AUTHOR_REGEX,
	IEEE_INDEX_NUMBER_NO_SPACE_ORG_AUTHOR_REGEX,
	IEEE_YEAR_REGEX,
	IEEE_ACCESSED_REGEX,
} = IEEE_ALL_REGEX;

describe('IEEE regex tests', () => {
	describe('IEEE_INDEX_NUMBER_REGEX', () => {
		test('passes citations that start with IEEE index number', () => {
			const validCases = [
				'[1] J. Smith, Title, 2020.',
				'[12] J. Smith, Title, 2020.',
				'[999] J. Smith, Title, 2020.',
			];

			for (const citation of validCases) {
				expect(IEEE_INDEX_NUMBER_REGEX.test(citation)).toBe(true);
			}
		});

		test('fails citations that do not start with IEEE index number', () => {
			const invalidCases = [
				'J. Smith, Title, 2020.',
				'1. J. Smith, Title, 2020.',
				'(1) J. Smith, Title, 2020.',
				' [1] J. Smith, Title, 2020.',
				'[A] J. Smith, Title, 2020.',
			];

			for (const citation of invalidCases) {
				expect(IEEE_INDEX_NUMBER_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('IEEE_AUTHOR_INDEX_REGEX', () => {
		test('passes personal author names after index number', () => {
			const validCases = [
				'[1] J. Smith, “Example title,” Journal, 2020.',
				'[2] J. K. Smith, “Example title,” Journal, 2020.',
				'[3] M. T. Kimour and D. Meslati, “Deriving objects from use cases,” 2005.',
				'[4] C. Wilson-Clark, “Computers ranked as key literacy,” 2007.',
				'[5] A. Altun, “Understanding hypertext,” 2005.',
			];

			for (const citation of validCases) {
				expect(IEEE_AUTHOR_INDEX_REGEX.test(citation)).toBe(true);
			}
		});

		test('fails malformed personal author names', () => {
			const invalidCases = [
				'[1] Smith, J., “Example title,” 2020.',
				'[2] John Smith, “Example title,” 2020.',
				'[3] J Smith, “Example title,” 2020.',
				'[4] j. Smith, “Example title,” 2020.',
				'[5] J. smith, “Example title,” 2020.',
				'[6]J. Smith, “Example title,” 2020.',
			];

			for (const citation of invalidCases) {
				expect(IEEE_AUTHOR_INDEX_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('IEEE_ORG_AUTHOR_INDEX_REGEX', () => {
		test('passes organization author names after index number', () => {
			const validCases = [
				'[1] World Health Organization. Report title, 2020.',
				'[2] European Telecommunications Standards Institute. Digital Video Broadcasting, 2007.',
				'[3] National University of Singapore. Academic integrity policy, 2024.',
				'[4] Council of Biology Editors. Scientific Style and Format, 2006.',
			];

			for (const citation of validCases) {
				expect(IEEE_ORG_AUTHOR_INDEX_REGEX.test(citation)).toBe(true);
			}
		});

		test('fails malformed organization author names', () => {
			const invalidCases = [
				'[1] world Health Organization. Report title, 2020.',
				'[2] 123 Organization. Report title, 2020.',
				'[3] .World Health Organization. Report title, 2020.',
				'[4]World Health Organization. Report title, 2020.',
			];

			for (const citation of invalidCases) {
				expect(IEEE_ORG_AUTHOR_INDEX_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('IEEE_INDEX_NUMBER_NO_SPACE_AUTHOR_REGEX', () => {
		test('detects missing space between index number and personal author', () => {
			const validCases = [
				'[1]J. Smith, “Example title,” 2020.',
				'[2]J. K. Smith, “Example title,” 2020.',
				'[3]C. Wilson-Clark, “Example title,” 2020.',
			];

			for (const citation of validCases) {
				expect(IEEE_INDEX_NUMBER_NO_SPACE_AUTHOR_REGEX.test(citation)).toBe(true);
			}
		});

		test('does not detect missing-space personal author when spacing is correct', () => {
			const invalidCases = [
				'[1] J. Smith, “Example title,” 2020.',
				'[2] J. K. Smith, “Example title,” 2020.',
				'[3] C. Wilson-Clark, “Example title,” 2020.',
			];

			for (const citation of invalidCases) {
				expect(IEEE_INDEX_NUMBER_NO_SPACE_AUTHOR_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('IEEE_INDEX_NUMBER_NO_SPACE_ORG_AUTHOR_REGEX', () => {
		test('detects missing space between index number and organization author', () => {
			const validCases = [
				'[1]World Health Organization. Report title, 2020.',
				'[2]European Telecommunications Standards Institute. Report title, 2020.',
				'[3]National University of Singapore. Academic integrity policy, 2024.',
			];

			for (const citation of validCases) {
				expect(IEEE_INDEX_NUMBER_NO_SPACE_ORG_AUTHOR_REGEX.test(citation)).toBe(true);
			}
		});

		test('does not detect missing-space organization author when spacing is correct', () => {
			const invalidCases = [
				'[1] World Health Organization. Report title, 2020.',
				'[2] European Telecommunications Standards Institute. Report title, 2020.',
				'[3] National University of Singapore. Academic integrity policy, 2024.',
			];

			for (const citation of invalidCases) {
				expect(IEEE_INDEX_NUMBER_NO_SPACE_ORG_AUTHOR_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('IEEE_YEAR_REGEX', () => {
		test('passes valid years from 1800 to 2099', () => {
			const validCases = [
				'Published in 1800.',
				'Published in 1999.',
				'Published in 2001.',
				'Published in 2024.',
				'Published in 2099.',
			];

			for (const citation of validCases) {
				expect(IEEE_YEAR_REGEX.test(citation)).toBe(true);
			}
		});

		test('fails missing or invalid years', () => {
			const invalidCases = [
				'Published in 1799.',
				'Published in 2100.',
				'Published in 999.',
				'Published in twenty twenty.',
				'No year here.',
			];

			for (const citation of invalidCases) {
				expect(IEEE_YEAR_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('IEEE_ACCESSED_REGEX', () => {
		test('passes valid accessed date formats', () => {
			const validCases = [
				'[Accessed: May 24, 2007]',
				'[Accessed May 24, 2007]',
				'[Accessed: November 12, 2007]',
				'[Accessed November 12, 2007]',
				'[Accessed: Sept. 18, 2007]',
				'[Accessed Sept. 18, 2007]',
				'[Accessed: Dec. 2, 2007]',
				'[Accessed Dec. 2, 2007]',
			];

			for (const citation of validCases) {
				expect(IEEE_ACCESSED_REGEX.test(citation)).toBe(true);
			}
		});

		test('fails invalid accessed date formats', () => {
			const invalidCases = [
				'Accessed May 24, 2007',
				'[Access May 24, 2007]',
				'[Accessed: 24 May, 2007]',
				'[Accessed May 24 2007]',
				'[Accessed May, 24, 2007]',
				'[Accessed May 24, 07]',
				'[Accessed]',
			];

			for (const citation of invalidCases) {
				expect(IEEE_ACCESSED_REGEX.test(citation)).toBe(false);
			}
		});
	});
});
