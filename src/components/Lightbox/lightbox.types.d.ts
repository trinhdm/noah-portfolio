
type NavigationItem = {
	content?: string
	id?: string
	index: number
	target: HTMLElement | null
	title?: string
	url?: string
}

type ArrowGroup = {
	next: NavigationItem
	prev: NavigationItem
}

type DirectoryGroup = ArrowGroup & {
	current: NavigationItem
}

type ArrowDirections = keyof ArrowGroup


type LightboxElements = {
	arrows: NodeListOf<HTMLElement> | undefined
	blocks: NodeListOf<HTMLElement> | undefined
	body: HTMLElement | undefined
	closeBtn: HTMLElement | undefined
	container: HTMLElement | undefined
	content: HTMLDivElement | undefined
	image?: HTMLImageElement | undefined
	overlay: HTMLElement | undefined
	pagination: HTMLElement | undefined
	root: HTMLDivElement
	video?: HTMLIFrameElement | HTMLVideoElement | undefined
}

type LightboxOptions = {
	elements: HTMLElement[]
	index: number
	properties?: LightboxProperties
	target: Node
}

type LightboxEventMap = {
	close: void
	open: void
	ready: { index: number }
	'swap:start': { direction: 'next' | 'prev'; index: number }
	'swap:finish': { index: number }
}

type LightboxEventNames =
	| 'ready'
	| 'open'
	| 'close'
	| 'navigate'
	| 'swap:start'
	| 'swap:finish'


export type {
	ArrowGroup,
	ArrowDirections,
	DirectoryGroup,
	LightboxElements,
	LightboxEventMap,
	LightboxEventNames,
	LightboxOptions,
}
