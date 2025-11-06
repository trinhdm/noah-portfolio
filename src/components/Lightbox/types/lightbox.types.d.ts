import type { HandlerFor } from '../../../services'
import type { PageDetails, Properties } from '../../../types'


type NavigationItem = PageDetails & {
	index: number
	target: HTMLElement | undefined
}

export type ArrowGroup = {
	next: NavigationItem
	prev: NavigationItem
}

export type ArrowDirections = keyof ArrowGroup


export interface LightboxOptions extends Pick<NavigationItem, 'index' | 'target'> {
	elements: HTMLElement[]
	properties?: Properties<HTMLDivElement>
}

export interface LightboxElements {
	arrows: HTMLElement[]
	blocks: HTMLElement[]
	body: HTMLDivElement | undefined
	container: HTMLDivElement | undefined
	content: HTMLDivElement | undefined
	exit: HTMLElement | undefined
	footer: HTMLDivElement | undefined
	html: HTMLElement[]
	icons: HTMLButtonElement[]
	image: HTMLDivElement | undefined
	navigation: HTMLElement | undefined
	player: HTMLIFrameElement | HTMLVideoElement | undefined
	root: HTMLDialogElement
	video: HTMLDivElement | undefined
}

// type LightboxElement = keyof LightboxElements
export type LightboxElement = LightboxElements[keyof LightboxElements]


export interface IManager {
	close(): Promise<void>
	open(index?: number): Promise<void>
}
