import type { HandlerFor } from '../../services'


type LightboxElements = {
	arrows: HTMLElement[]
	blocks: HTMLElement[]
	body: HTMLDivElement | undefined
	close: HTMLElement | undefined
	container: HTMLDivElement | undefined
	content: HTMLDivElement | undefined
	footer: HTMLDivElement | undefined
	header: HTMLDivElement | undefined
	image: HTMLDivElement | undefined
	navigation: HTMLElement | undefined
	overlay: HTMLDivElement | undefined
	player: HTMLIFrameElement | HTMLVideoElement | undefined
	root: HTMLDivElement
	video: HTMLDivElement | undefined
}

type LightboxElement = keyof LightboxElements

type LightboxStates = 'open' | 'change' | 'close'

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

interface LightboxDispatcher<E = LightboxEventMap> {
	on<K extends keyof E>(event: K, handler: HandlerFor<E, K>): void
	off<K extends keyof E>(event: K, handler: HandlerFor<E, K>): void
	emit<K extends keyof E>(event: K, payload?: E[K]): Promise<void>
	clear<K extends keyof E>(event?: K): void
}


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
	LightboxDispatcher,
	LightboxElement,
	LightboxElements,
	LightboxEventMap,
	LightboxOptions,
	LightboxStates,
}
