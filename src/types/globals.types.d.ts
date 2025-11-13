import type { AnimationOptions } from '../services'


export type Entries<T> = Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>
export type Properties<T extends HTMLElement = HTMLElement> = Record<keyof T, T[keyof T]> | {}


interface Events {
	click: MouseEvent
	focusin: FocusEvent
	keydown: KeyboardEvent
}

type EventHandler<K extends keyof Events> = (event: Events[K]) => void

export type FilterValues<T, V> = {
	[K in keyof T as T[K] extends V ? never : K]: T[K]
}

export type WithOptional<T, U extends keyof T> = Omit<T, U> & Partial<Pick<T, U>>
export type WithRequired<T, U extends keyof T> = T & Required<Pick<T, U>>
export type OnlyRequired<T, U extends keyof T> = Partial<Omit<T, U>> & Required<Pick<T, U>>


export type PageGroup = {
	id: string
	url: string
}

export type PageDetails = PageGroup & {
	content: HTMLElement
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

