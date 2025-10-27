import type { PageGroup } from '../../../global/utils.types'


type NavigationItem = {
	index: number
	target: HTMLElement | null
	text?: string
}

type ArrowsGroup = {
	next: NavigationItem
	prev: NavigationItem
}

type ArrowDirection = keyof ArrowsGroup


type LightboxProperties<T extends HTMLElement = HTMLDivElement> = Record<keyof T, T[keyof T]> | {}

type LightboxElements = {
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
	content?: Promise<string | undefined>
	elements: HTMLElement[]
	index: number
	page: PageGroup | undefined
	properties?: LightboxProperties
	target: Node
}


export type {
	ArrowsGroup,
	ArrowDirection,
	LightboxElements,
	LightboxOptions,
	LightboxProperties,
}
