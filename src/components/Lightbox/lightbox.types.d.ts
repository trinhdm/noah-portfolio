
type LightboxElements = {
	arrows: NodeListOf<HTMLElement> | undefined
	blocks: NodeListOf<HTMLElement> | undefined
	body: HTMLElement | undefined
	close: HTMLElement | undefined
	container: HTMLElement | undefined
	content: HTMLDivElement | undefined
	image?: HTMLImageElement | undefined
	navigation: HTMLElement | undefined
	overlay: HTMLElement | undefined
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
	navigate: ArrowDirections
	open: void
	ready: LightboxOptions
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
	ArrowGroup,
	ArrowDirections,
	LightboxElements,
	LightboxEventMap,
	LightboxOptions,
	LightboxStates,
}
