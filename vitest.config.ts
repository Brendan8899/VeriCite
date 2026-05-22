import { defineConfig } from 'vitest/config';

const isCI = !!process.env.CI;

export default defineConfig({
	test: {
		reporters: isCI ? ['default', 'github-actions'] : ['default'],
		coverage: {
			provider: 'v8',
			enabled: true,
			reportOnFailure: true,
			reportsDirectory: './coverage',
			reporter: isCI ? ['text', 'json', 'json-summary'] : ['text', 'html'],

			thresholds: undefined,
			// thresholds: isCI ? {
			// 	lines: 80,
			// 	branches: 80,
			// 	functions: 80,
			// 	statements: 80
			// } : undefined,
		},
	},
});
