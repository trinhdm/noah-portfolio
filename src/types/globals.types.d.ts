import type { AnimationOptions } from '../services'


export type Entries<T> = Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>
export type Properties<T extends HTMLElement = HTMLElement> = Record<keyof T, T[keyof T]> | {}


interface Events {
	click: MouseEvent
	focusin: FocusEvent
	keydown: KeyboardEvent
}
type EventHandler<K extends keyof Events> = (event: Events[K]) => void


export type FilterObjArrs<T> = {
	[K in keyof T as T[K] extends any[] ? never : K]: T[K]
}


export type PageGroup = {
	id: string
	url: string
}

export type PageDetails = PageGroup & {
	content: string
	title: HTMLElement | undefined
}


const BLOCK_TYPES = ['html', 'image', 'video'] as const
export type BlockTypes = typeof BLOCK_TYPES[number]

export interface BlockOptions {
	animation?: AnimationOptions
	className: string
    index: number
	target: HTMLElement
}

