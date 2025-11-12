import fsp from 'fs/promises'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { getTimestamp, logMsg } from './logs.ts'


interface CompileOptions {
	directory: string
	template: string
}

interface FileDestination {
	files: string[],
	name: string,
	pathname: string,
}

const safeExecute = async <T>({ error, fn, log }: {
	error: string
	fn: () => Promise<T>
	log?: Parameters<typeof logMsg>
}): Promise<T | undefined> => {
	try {
		const result = await fn()
		if (log) logMsg(...log)
		return result
	} catch (err) {
		const hasCustomError = Boolean(error)
		const hasInnerError = err instanceof Error

		const message = [
			hasCustomError ? error : null,
			// hasInnerError ? '' : String(err)
		]
			.filter(Boolean)
			.join('\n')

		const content = {
			output: message,
			input: err.stack?.split('\n').slice(1).join('\n').trim() ?? '',
		}

		logMsg('error', content)
		return undefined
	}
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

const createHTMLFile = async ({ files, name, pathname }: FileDestination) =>
	safeExecute({
		fn: async () => {
			const content = await buildHTML(files)
			await fsp.writeFile(pathname, content, 'utf-8')

			return {
				content,
				lines: content.split('\n').length,
				name,
			}
		},
		log: ['compile', { input: files, output: pathname }],
		error: files.length
			? `Unable to create HTML File`
			: `No files found to bundle.`,
	})

const runProcess = (command: string, content?: string): Promise<void> =>
	new Promise<void>((resolve, reject) => {
		const process = spawn(command)

		if (content) process.stdin.write(content)
		process.stdin.end()
		process.on('close', code => (code === 0 ? resolve() : reject(new Error(``))))
	})

const copyToClipboard = async ({ content, lines, name }): Promise<void> => {
	const commands = {
		darwin: 'pbcopy',
		linux: 'xclip',
		win32: 'clip',
	} as const

	const platform = os.platform(),
		command = commands[platform]

	return await safeExecute({
		fn: () => runProcess(command, content),
		log: ['copy', { input: lines, output: name }],
		error: command
			? 'Clipboard copy failed'
			: `Clipboard not supported on platform: ${platform}`,
	})
}

export const compileBundles = async (options: CompileOptions) =>
	safeExecute({
		fn: async () => {
			console.log(getTimestamp())

			const destination = await getDestination(options),
				fileContent = await createHTMLFile(destination)

			if (fileContent) await copyToClipboard(fileContent)
		},
		error: `No such file or directory`,
	})
