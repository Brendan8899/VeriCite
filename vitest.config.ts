import { defineConfig } from 'vitest/config';

const isCI = !!process.env.CI

export default defineConfig({
	test: {
		reporters: isCI ? ['default', 'github-actions'] : ['default'],
		coverage: {
			provider: 'v8',
			enabled: true,
			// Forces Vitest to write the coverage files even if a unit test fails
			reportOnFailure: true,
			// Explicitly forces the root directory destination
			reportsDirectory: './coverage',
			// 'json-summary' is for GitHub Action
			reporter: isCI
				? ['text', 'json-summary']
				: ['text', 'html'],


			thresholds: undefined,
			// thresholds: isCI ? {
			// 	lines: 80,
			// 	branches: 80,
			// 	functions: 80,
			// 	statements: 80
			// } : undefined,
		},
	}
});
