import type { LightboxElements } from '../../../types'

import type {
	DataValues,
	LightboxAnimations,
	LightboxStates,
	LightboxVideoOptions,
} from './presentation.types.d.ts'


export interface IAnimator {
	Root: {
		fadeIn(): Promise<void>
		fadeOut(): Promise<void>
	}
	swap(direction: 'in' | 'out'): Promise<void>
}


export interface ICache {
	clear(): void
	get<K extends keyof LightboxElements>(key: K): LightboxElements[K]
	rebuild(): void
	reset<K extends keyof LightboxElements>(key: K): void
}


export interface IDOM {
	append(): void
	clearCache(): void
	get<K extends keyof LightboxElements>(key: K): LightboxElements[K]
	getData<K extends keyof DataValues>(key: K): DataValues[K]
	onChange(
		attr: string,
		callback: (current: string | null, observer: MutationObserver) => void
	): MutationObserver
	rebuildCache(): void
	remove(): void
	reset<K extends keyof LightboxElements>(key: K): void
	setAnimate(value: LightboxAnimations = ''): void
	setContent(content: HTMLElement | undefined): void
	setState(state: LightboxStates): void
	toggleDisable(): void
	toggleIcons(): void
	updateContent(content: HTMLElement | undefined): void
}


export interface IEvents {
	bind(): void
	unbind(): void
}


export interface IMedia {
	dispose(): void
	load(options?: LightboxVideoOptions): void
	pause(): void
	play(): void
}
