import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'


const prettifyFileName = (filePath) => `\x1b[90m\x1b[22m\x1b[3m${filePath}\x1B[0m`

const createHTMLFile = (files, outDir, destination) => {
	let htmlContent = ''

	for (const file of files) {
		const filePath = path.join(outDir, file),
			fileExt = path.extname(file).toLowerCase(),
			fileData = fs.readFileSync(filePath, 'utf-8')

		htmlContent += ({
			err: `skipping unsupported file: ${file}`,
			'.css': `<style>\n${fileData}\n</style>\n\n`,
			'.js': `<script>\n${fileData}\n</script>\n\n`,
		}[`${fileExt}` ?? 'err'])
	}

	fs.writeFileSync(destination, htmlContent, 'utf-8')

	const dist = outDir.split('/').at(-1),
		fileNames = files.map(file => `'\x1b[32m${dist}/${file}\x1b[0m'`).join(', ')

	const message = `
	\x1b[92m\x1b[1m✅ Success!\x1b[0m\n
   Bundled and minified code with esbuild: [\x1b[32m${fileNames}\x1b[0m].
   Created a HTML file and inlined the bundled code, located here:
   ${prettifyFileName(destination)}`

	console.log(message.trim())

	return htmlContent
}

const copyToClipboard = (text, destination) => {
	const pbcopy = spawn('pbcopy')

	pbcopy.stdin.write(text)
	pbcopy.stdin.end()
	let message = `\n\n`

	pbcopy.on('error', err => console.error('Error copying to clipboard:', err));
	pbcopy.on('close', code => {
		message += code === 0
			? `\x1b[33m\x1b[1m📋 File contents are copied to clipboard\x1B[0m: ${prettifyFileName(destination)}`
			: `pbcopy exited with code ${code}`

		console.log(`${message}\n`)
	})
}

const compileBundles = () =>  {
	const template = 'index.html',
		directory = './dist'

	const destination = `${directory}/${template}`,
		destinationPath = path.resolve(destination)

	const outDir = path.resolve(directory),
		files = fs.readdirSync(outDir).filter(f => f !== template)

	const fileContent = createHTMLFile(files, outDir, destinationPath)
	copyToClipboard(fileContent, destination)
}

compileBundles()
