
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
	navigate: ArrowDirections
	ready: LightboxOptions
	'swap:start': {
		dir: ArrowDirections
		index: number
	}
	'swap:finish': {
		dir: ArrowDirections
		directory: ArrowGroup
	}
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
	LightboxElements,
	LightboxEventMap,
	LightboxEventNames,
	LightboxOptions,
}
