import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'


const copyToClipboard = (text) => {
	const pbcopy = spawn('pbcopy')

	pbcopy.stdin.write(text)
	pbcopy.stdin.end()

	pbcopy.on('error', err => console.error('Error copying to clipboard:', err));
	pbcopy.on('close', code => {
		const message = code === 0
			? '📋 File contents are copied to clipboard.'
			: `pbcopy exited with code ${code}`

		console.log(message)
	})
}

const compileBundles = () =>  {
	const template = 'index.html',
		directory = './dist',
		outDir = path.resolve(directory),
		destination = path.resolve(`${directory}/${template}`)

	const message = `Success! ✅ Compiled all of the bundled assets (CSS, JS, etc.) from ${directory}, and generated a single HTML file with the bundled assets inlined.
	The file is located here:
	${destination}`

	const createHTMLFile = () => {
		const files = fs.readdirSync(outDir).filter(f => f !== template);
		let htmlContent = ''

		for (const file of files) {
			const filePath = path.join(outDir, file),
				fileExt = path.extname(file).toLowerCase(),
				fileData = fs.readFileSync(filePath, "utf-8")

			htmlContent += ({
				err: `skipping unsupported file: ${file}`,
				'.css': `<style>\n${fileData}\n</style>\n\n`,
				'.js': `<script>\n${fileData}\n</script>\n\n`,
			}[`${fileExt}` ?? 'err'])
		}

		fs.writeFileSync(destination, htmlContent, 'utf-8')
		console.log(message.trim())

		return htmlContent
	}

	const fileContent = createHTMLFile()
	copyToClipboard(fileContent)
}

compileBundles()
