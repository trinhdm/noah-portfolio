import type { ArrowsGroup } from '../block/block.types'
import type { PageGroup } from '../../../global/utils.types'


type WithoutEmpty<T> = T extends T ? {} extends T ? never : T : never


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
	elements: NodeListOf<HTMLElement>
	index: number
	page: PageGroup | undefined
	properties: Record<keyof T, T[keyof T]> | {};
}


type LightboxContentOptions = {
	elements: NodeListOf<HTMLElement>
	index: number | undefined
	page: PageGroup | undefined
}


export type {
	LightboxContentOptions,
	LightboxElements,
	LightboxOptions,
	LightboxProperties,
}
