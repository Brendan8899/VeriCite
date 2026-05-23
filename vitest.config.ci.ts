import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			reporters: ['github-actions', 'json'],
			outputFile: {
				json: './ctrf-report.json',
			},
			coverage: {
				enabled: true,
				reporter: ['text', 'json', 'json-summary'],
			},
		},
	}),
);
