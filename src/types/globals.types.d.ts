import type { BaseAnimationOptions } from '../services/AnimationService'


interface BlockOptions {
	animation?: BaseAnimationOptions
	className: string
    index: number
	target: HTMLElement
}

const BLOCK_TYPES = ['html', 'image', 'video'] as const
type BlockTypes = typeof BLOCK_TYPES[number]


export type {
	BlockOptions,
	BlockTypes,
}
