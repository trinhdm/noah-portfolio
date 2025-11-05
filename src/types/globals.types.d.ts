import type { AnimationOptions } from '../services'


export type Entries<T> = Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>
export type Properties<T extends HTMLElement = HTMLElement> = Record<keyof T, T[keyof T]> | {}

export type FilterObjArrs<T> = {
	[K in keyof T as T[K] extends any[] ? never : K]: T[K]
}


export type HTMLTarget = HTMLElement | null | undefined

export type PageGroup = {
	id: string
	url: string
}

export type PageDetails = PageGroup & {
	content: string
	title: HTMLTarget
}


export interface BlockOptions {
	animation?: AnimationOptions
	className: string
    index: number
	target: HTMLElement
}

const BLOCK_TYPES = ['html', 'image', 'video'] as const
export type BlockTypes = typeof BLOCK_TYPES[number]
