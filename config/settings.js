import esbuildPluginTsc from 'esbuild-plugin-tsc'

export const createBuildSettings = options => {
  	return {
		entryPoints: ['src/index.ts'],
		outfile: 'dist/index.js',
		format: 'esm',
		platform: 'browser',
		target: ['ESNext'],
		allowOverwrite: true,
		bundle: true,
		treeShaking: false,
		plugins: [
			esbuildPluginTsc({
				force: true
			}),
		],
		...options
  	}
}
