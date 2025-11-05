import type { HandlerFor } from '../../services'
import type { PageDetails, Properties } from '../../types'


type NavigationItem = PageDetails & {
	index: number
	target: HTMLElement | undefined
}

type ArrowGroup = {
	next: NavigationItem
	prev: NavigationItem
}

type ArrowDirections = keyof ArrowGroup



interface LightboxOptions extends Pick<NavigationItem, 'index' | 'target'> {
	elements: HTMLElement[]
	properties?: Properties<HTMLDivElement>
}

type LightboxElements = {
	arrows: HTMLElement[]
	blocks: HTMLElement[]
	body: HTMLDivElement | undefined
	closeBtn: HTMLElement | undefined
	container: HTMLDivElement | undefined
	content: HTMLDivElement | undefined
	footer: HTMLDivElement | undefined
	header: HTMLDivElement | undefined
	icons: HTMLElement[]
	image: HTMLDivElement | undefined
	navigation: HTMLElement | undefined
	overlay: HTMLDivElement | undefined
	player: HTMLIFrameElement | HTMLVideoElement | undefined
	root: HTMLDivElement
	video: HTMLDivElement | undefined
}

type LightboxElement = keyof LightboxElements

type LightboxStates = 'open' | 'change' | 'close'

interface LightboxEventMap {
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
