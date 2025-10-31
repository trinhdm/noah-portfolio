import * as esbuild from 'esbuild'
import { createBuildSettings } from './settings.js'


const settings = createBuildSettings({
	allowOverwrite: true,
	bundle: true,
	minify: true,
	treeShaking: false,
})


await esbuild.build(settings)
