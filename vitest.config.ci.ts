import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			reporters: ['github-actions', 'junit', 'json'],
			outputFile: {
				junit: './junit.xml',
				json: './jest-results.json',
			},
			coverage: {
				enabled: true,
				reporter: ['text', 'json', 'json-summary'],
			},
		},
	}),
);
