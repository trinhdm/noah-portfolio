import esbuildPluginTsc from 'esbuild-plugin-tsc'
import fs from 'fs'
import path from 'path'


export const createBuildSettings = options => {
	const pkgPath = path.resolve('package.json')
	let external = []

	try {
		const packages = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

		const {
			dependencies,
			// devDependencies,
			peerDependencies,
		} = packages

		external = [
			...Object.keys(dependencies || {}),
			...Object.keys(peerDependencies || {}),
		]
	} catch (err) { console.error('error reading package.json:', err) }

	const plugins = [
		esbuildPluginTsc({
			force: true
		}),
	]

  	return {
		...options,
		// external,
		plugins,
		entryPoints: ['src/index.ts'],
		outfile: 'dist/index.js',
		format: 'esm',
		platform: 'browser',
		target: ['ESNext'],
  	}
}
