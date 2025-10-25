import type { PageGroup } from '../../../global/utils.types'


type LightboxProperties<T extends HTMLElement = HTMLDivElement> = Record<keyof T, T[keyof T]> | {}

type LightboxElements = {
	blocks: NodeListOf<HTMLElement> | undefined
	body: HTMLElement | undefined
	closeBtn: HTMLElement | undefined
	container: HTMLElement | undefined
	content: HTMLDivElement | undefined
	image?: HTMLImageElement | undefined
	navigation: HTMLElement | undefined
	overlay: HTMLElement | undefined
	root: HTMLDivElement
	video?: HTMLIFrameElement | HTMLVideoElement | undefined
}

type LightboxOptions<T extends HTMLElement = HTMLDivElement> = {
	content: HTMLDivElement | undefined
	elements: HTMLElement[]
	index: number
	page: PageGroup | undefined
	properties: Record<keyof T, T[keyof T]> | {};
}


export type {
	LightboxElements,
	LightboxOptions,
	LightboxProperties,
}
