import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['index.ts', 'service-worker.ts'],
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
