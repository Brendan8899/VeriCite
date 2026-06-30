import { describe, test, expect } from 'vitest';

import { APA_ALL_REGEX } from '../src/verifyAPA';

const {
	YEAR_REGEX,
	AUTHOR_REGEX,
	ORG_AUTHOR_REGEX,
	YEAR_AFTER_AUTHOR_REGEX,
	YEAR_AFTER_ORG_AUTHOR_REGEX,
	HYPHEN_PAGE_RANGE_REGEX,
} = APA_ALL_REGEX;

describe('APA regex tests', () => {
	describe('YEAR_REGEX', () => {
		test('passes valid years from 1800 to 2099', () => {
			const validCases = [
				'Published in (1800).',
				'Published in (1999).',
				'Published in (2001).',
				'Published in (2024).',
				'Published in (2099).',
			];

			for (const citation of validCases) {
				expect(YEAR_REGEX.test(citation)).toBe(true);
			}
		});

		test('fails missing or invalid years', () => {
			const invalidCases = [
				'Published in 2026.',
				'Published in 999.',
				'Published in 21000.',
				'Published in twenty twenty.',
			];

			for (const citation of invalidCases) {
				expect(YEAR_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('AUTHOR_REGEX', () => {
		test('passes valid author format', () => {
			const validCases = [
				'Smith, J. A., & Doe, B. (2021).',
				'Smith, J. K. (2021)',
				'Kimour, M. T.',
			];

			for (const citation of validCases) {
				expect(AUTHOR_REGEX.test(citation)).toBe(true);
			}
		});

		test('fails invalid author format', () => {
			const invalidCases = ['Smith AJ', 'Smith', 'AJ', 'M. J.', "Hi I'm Neil"];

			for (const citation of invalidCases) {
				expect(AUTHOR_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('ORG_AUTHOR_REGEX', () => {
		test('passes valid org author format', () => {
			const validCases = ['Merriam-Webster.', 'World Health Organisation.', 'Bungie.', 'Bandai.'];

			for (const citation of validCases) {
				expect(ORG_AUTHOR_REGEX.test(citation)).toBe(true);
			}
		});

		test('fails invalid org author format', () => {
			const invalidCases = ['world health org', 'lol.', 'Apa Organisation', 'John Smith'];

			for (const citation of invalidCases) {
				expect(ORG_AUTHOR_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('YEAR_AFTER_AUTHOR_REGEX', () => {
		test('passes year after author format', () => {
			const validCases = [
				'Smith, J. (2021).',
				'Smith, J. A. (2021).',
				'Kimour, M. T. (n.d.).',
				'Garcia-Lopez, M. (1999, March 1).',
			];

			for (const citation of validCases) {
				expect(YEAR_AFTER_AUTHOR_REGEX.test(citation)).toBe(true);
			}
		});

		test('fails when year is not immediately after author', () => {
			const invalidCases = [
				'Smith, J. Title (2021).',
				'Smith J. (2021).',
				'(2021). Smith, J.',
				'Smith, J. 2021.',
			];

			for (const citation of invalidCases) {
				expect(YEAR_AFTER_AUTHOR_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('YEAR_AFTER_ORG_AUTHOR_REGEX', () => {
		test('passes org author followed by year', () => {
			const validCases = [
				'Merriam-Webster. (2008).',
				'World Health Organization. (2021).',
				'Bungie. (n.d.).',
				'Bandai. (1999, March).',
			];

			for (const citation of validCases) {
				expect(YEAR_AFTER_ORG_AUTHOR_REGEX.test(citation)).toBe(true);
			}
		});

		test('fails when org/year format is incorrect', () => {
			const invalidCases = [
				'Merriam-Webster (2008).',
				'merriam-webster. (2008).',
				'World Health Organization (2021).',
			];

			for (const citation of invalidCases) {
				expect(YEAR_AFTER_ORG_AUTHOR_REGEX.test(citation)).toBe(false);
			}
		});
	});

	describe('HYPHEN_PAGE_RANGE_REGEX', () => {
		test('detects hyphen page ranges', () => {
			const cases = ['Journal, 4(1), 10-20.', 'Volume, 2, 100-101'];

			for (const c of cases) expect(HYPHEN_PAGE_RANGE_REGEX.test(c)).toBe(true);
		});

		test('does not match en-dash page ranges', () => {
			const cases = ['Journal, 4(1), 10–20.', 'Pages, 5–6'];

			for (const c of cases) expect(HYPHEN_PAGE_RANGE_REGEX.test(c)).toBe(false);
		});
	});
});
