import fsp from 'fs/promises'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'


interface CompileOptions {
	directory: string
	template: string
}

interface FileDestination {
	files: string[],
	name: string,
	pathname: string,
}

const COLORS = {
	gray: 90,
	green: 32,
	red: 31,
	yellow: 33,
} as const

const STYLES = {
	bold: 1,
	italic: 3,
} as const


type ColorKey = keyof typeof COLORS
type StyleKey = keyof typeof STYLES

type Colorized = {
	(str: string): string
	bold: (str: string) => string
	italic: (str: string) => string
}

type Stylized = Record<ColorKey, Colorized>


type LogType = 'compile' | 'copy' | 'error'

interface LogContent {
	input: number | string | (number | string)[]
	output: number | string
}

interface ContentLogMap {
	compile: LogContent
	copy: LogContent
	error: string
}

interface LogTemplate extends Partial<LogContent> {
	body: string
	color: ColorKey
	icon: string
	title: string
}

type LogTemplateGenerator<T extends LogType> = {
	build: ((content: ContentLogMap[T]) => LogTemplate)
	template: string
}

type LogMethod = <T extends keyof ContentLogMap>(type: T, content: ContentLogMap[T]) => void


const stylize = (str: string, color: ColorKey, style?: StyleKey): string => {
	const codes = [COLORS[color], style && STYLES[style]].filter(Boolean),
		ansi = codes.map(c => `\x1b[${c}m`).join('')

	return `${ansi}${str}\x1b[0m`
}

const setFont = (color: ColorKey): Colorized => {
	const base = (str: string) => stylize(str, color)

	base.bold = (str: string) => stylize(str, color, 'bold')
	base.italic = (str: string) => stylize(str, color, 'italic')

	return base
}

const setFonts = (): Stylized => Object.fromEntries(
	(Object.keys(COLORS) as ColorKey[]).map(color => [color, setFont(color)])
) as Stylized

const font = setFonts()

const replaceTokens = (target: string, ctx: LogTemplate, depth = 0): string => {
	if (depth > 2) return target
	const color = font[ctx.color]

	const formatters: Record<string, (val) => string> = {
		input: val => {
			const v = Array.isArray(val)
				? val.map(v => color(`'${v}'`)).join(', ')
				: color(val)
			return `[${v}]`
		},
		output: val => font.gray.italic(val),
		title: val => `${color.bold(val.slice(0, -1))}${val.slice(-1)}`,
	} as const

	const result = target.replace(/\{(\w+)\}/g, (_, token) => {
		let value = ctx[token]
		if (!value) return ''

		const formatter = formatters[token as keyof typeof formatters]
		value = formatter?.(value) ?? value

		return String(value)
	})

	return replaceTokens(result, ctx, depth + 1)
}

const logDefinitions: { [K in LogType]: LogTemplateGenerator<K> } = {
	compile: {
		build: content => ({
			color: 'green',
			icon: '✅',
			title: 'Success!',
			body: `Bundled and minified code with esbuild: {input}
				Created a HTML file and inlined the bundled code, located here:
				{output}`,
			...content,
		}),
		template: `
			{icon} {title}\n
			{body}
		`,
	},
	copy: {
		build: content => ({
			color: 'yellow',
			icon: '📋',
			title: `Copied file contents to clipboard:`,
			body: `Line count: {input}`,
			...content,
		}),
		template: `
			{icon} {title} {output}\n
			{body}
		`,
	},
	error: {
		build: content => ({
			color: 'red',
			icon: '☠️',
			title: 'Compilation Failed:',
			body: `${content}`,
		}),
		template: `
			{icon}  {title}\n
			{body}
		`,
	}
}

const logMsg: LogMethod = (type, content) => {
	const definition = logDefinitions[type]
	const { body, color, icon, input, output, title } = definition.build(content)

	const header = `${font[color].bold(title.slice(0, -1))}${title.slice(-1)}`
	const result = definition.template.trim()
		.replace(/\{icon\}/g, icon)
		.replace(/\{title\}/g, header)
		.replace(/\{body\}/g, body.trim())
		.replace(/\{input\}/g, `[${font[color](input)}]`)
		.replace(/\{output\}/g, `${font.gray.italic(output)}`)
		.split('\n').map(line => line.trim()).join('\n   ')

	console.log(`\n${result.trim()}\n`)
}

const buildHTML = async (files: FileDestination['files']) => {
	const tags = {
		css: 'style',
		js: 'script',
	}

	let html = ''
	for (const file of files) {
		const ext = path.extname(file).toLowerCase().slice(1)
		if (!ext || !Object.hasOwn(tags, ext)) continue

		const pathname = path.resolve(file),
			fileData = await fsp.readFile(pathname, 'utf-8')

		const tag = tags[ext]

		const content = `<${tag}>\n${fileData}\n</${tag}>\n`
		html += content
		// ?? `skipping unsupported file: ${file}`
	}

	return html
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
