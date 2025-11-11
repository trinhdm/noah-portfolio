import fsp from 'fs/promises'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { logMsg } from './logs.ts'


interface CompileOptions {
	directory: string
	template: string
}

interface FileDestination {
	files: string[],
	name: string,
	pathname: string,
}

const getDestination = async ({ directory, template }: CompileOptions): Promise<FileDestination> => {
	const absDir = path.resolve(directory),
		entries = await fsp.readdir(absDir, { withFileTypes: true })

	const files = entries
		.filter(e => e.isFile() && e.name !== template)
		.map(e => path.join(directory, e.name))

	return {
		files,
		name: path.join(directory, template),
		pathname: path.resolve(directory, template),
	}
}

const buildHTML = async (files: FileDestination['files']) => {
	const tags = {
		css: 'style',
		js: 'script',
	}

	const html = await Promise.all(
		files.map(async file => {
			const ext = path.extname(file).toLowerCase().slice(1),
				tag = tags[ext]
			if (!tag) return

			const data = await fsp.readFile(file, 'utf-8')
			const content = `<${tag}>${data}</${tag}>\n`

			return content
		})
	)

	return html.filter(Boolean).join('\n').trim()
}

const createHTMLFile = async ({ files, pathname }: FileDestination) => {
	if (!files.length) return

	const content = await buildHTML(files)
	await fsp.writeFile(pathname, content, 'utf-8')

	logMsg('compile', { input: files, output: pathname })

	return {
		content,
		lines: content.split('\n').length,
	}
}

const copyToClipboard = async (content: string): Promise<boolean> => {
	const commands = {
		darwin: 'pbcopy',
		linux: 'xclip',
		win32: 'clip',
	} as const

	const platform = os.platform(),
		command = commands[platform]

	if (!command) {
		logMsg('error', `Clipboard not supported on platform: ${platform}`)
		return false
	}

	return await new Promise<boolean>((resolve, reject) => {
		const process = spawn(command)

		process.stdin.write(content)
		process.stdin.end()
		process.on('close', code => resolve(code === 0))
		// process.on('close', code => (
		// 	(code === 0 ? resolve(true) : reject(new Error(`Clipboard copy failed with code ${code}`)))
		// ))
	})
}

const compileBundles = async (options: CompileOptions) =>  {
	const destination = await getDestination(options)
	const fileContent = await createHTMLFile(destination)

	if (fileContent) {
		const hasCopied = await copyToClipboard(fileContent.content)
		if (hasCopied)
			logMsg('copy', { input: fileContent.lines, output: destination.name })
	}

	// console.log('\n\n---\n\n', destination, '\n\n---\n\n')
}


compileBundles({ directory: './dist', template: 'index.html' })
	.catch(err => logMsg('error', `${err.name}: ${err.stack ?? err.message}`))
