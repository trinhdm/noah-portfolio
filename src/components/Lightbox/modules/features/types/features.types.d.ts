import { BaseMedia } from '../media/BaseMedia'


export type BlockHandler = (block: HTMLElement) => HTMLElement | null


export interface VideoMediaOptions {
	controls?: boolean
	loop?: boolean
	muted?: boolean
	[key: string]: boolean | number | string
}


export interface MediaModule<T extends HTMLElement = HTMLElement> {
	new (element: T, options?: VideoMediaOptions): BaseMedia<T>
	isMatch?(element: T): boolean
}

export type AsyncLoader<T extends HTMLElement = HTMLElement> = () => Promise<
	{ default: MediaModule<T> }
>
