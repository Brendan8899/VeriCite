import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		reporters: ['dot', 'default'],
		coverage: {
			provider: 'v8',
			reportOnFailure: true,
			reportsDirectory: './coverage',
			reporter: ['text', 'html'],

			thresholds: undefined,
			// thresholds: {
			// 	lines: 80,
			// 	branches: 80,
			// 	functions: 80,
			// 	statements: 80
			// },
		},
	},
});
