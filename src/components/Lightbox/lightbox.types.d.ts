
type LightboxElements = {
	arrows: NodeListOf<HTMLElement> | undefined
	blocks: NodeListOf<HTMLElement> | undefined
	body: HTMLDivElement | undefined
	close: HTMLElement | undefined
	container: HTMLDivElement | undefined
	content: HTMLDivElement | undefined
	footer: HTMLDivElement | undefined
	header: HTMLDivElement | undefined
	image?: HTMLImageElement | undefined
	navigation: HTMLElement | undefined
	overlay: HTMLElement | undefined
	root: HTMLDivElement
	video?: HTMLIFrameElement | HTMLVideoElement | undefined
}

type LightboxElement = keyof LightboxElements

type LightboxOptions = {
	elements: HTMLElement[]
	index: number
	properties?: LightboxProperties
	target: Node
}

type LightboxEventMap = {
	close: void
	error: {
		error: unknown
		message?: string
	}
	navigate: ArrowDirections
	open: void
	update: number
}

type LightboxStates = 'open' | 'change' | 'close'


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


export type {
	ArrowDirections,
	ArrowGroup,
	LightboxElement,
	LightboxElements,
	LightboxEventMap,
	LightboxOptions,
	LightboxStates,
}
