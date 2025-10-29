import type { BaseAnimationOptions } from '../services/AnimationService'


interface BlockOptions {
	animation?: BaseAnimationOptions
	className: string
    index: number
	target: HTMLElement
}


export type { BlockOptions }
