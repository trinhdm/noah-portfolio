import type { BaseAnimationOptions } from '../services/AnimationService'


export type Entries<T> = Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>
export type Properties<T extends HTMLElement = HTMLElement> = Record<keyof T, T[keyof T]> | {}


export interface BlockOptions {
	animation?: BaseAnimationOptions
	className: string
    index: number
	target: HTMLElement
}

const BLOCK_TYPES = ['html', 'image', 'video'] as const
export type BlockTypes = typeof BLOCK_TYPES[number]
