

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


const normalizeWhitespace = (text: string, separator: string = '\n'): string =>
	text
		.split(separator)
		.map(str => str.trim())
		// .filter(Boolean)
		.join(`${separator}   `)

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

export const logMsg: LogMethod = (type, content) => {
	const definition = logDefinitions[type]
	const context = definition.build(content)

	let output = replaceTokens(definition.template, context)
	output = normalizeWhitespace(output)
	output = `\n${output.trim()}\n`

	console.log(output)
	return
}
