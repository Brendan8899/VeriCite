import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: {
		index: 'index.ts',
		'service-worker': 'service-worker.ts',
		feedbackReport: 'src/feedbackGenerationEngine/feedbackReport.ts',
	},
	format: 'esm',
	outDir: 'dist',
	dts: false,
	outExtensions: () => ({
		js: '.js',
	}),
	deps: {
		alwaysBundle: ['webextension-polyfill'],
	},
});
