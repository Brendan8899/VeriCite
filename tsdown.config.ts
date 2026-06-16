import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: {
		index: './src/index.ts',
		'service-worker': './src/service-worker.ts',
		feedbackReport: './src/feedbackGenerationEngine/feedbackReport.ts',
	},
	format: 'esm',
	outDir: 'dist',
	dts: false,
	deps: {
		alwaysBundle: ['webextension-polyfill'],
	},
	copy: ['src/index.html', 'src/manifest.json'],
});
