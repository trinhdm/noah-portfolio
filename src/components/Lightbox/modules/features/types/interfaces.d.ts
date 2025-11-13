import type { ArrowGroup, LightboxOptions } from '../../../types'
import type { BlockHandler, VideoMediaOptions } from './features.types.d.ts'

import type {
	BlockTypes,
	OnlyRequired,
	PageDetails,
} from '../../../../../types'


export interface IBlocks {
	format(block: HTMLElement): HTMLElement | null
	register(type: BlockTypes, handler: BlockHandler): void
}


export interface IContent {
	fetch(target: HTMLElement | undefined): Promise<PageDetails | undefined>
	prefetch(target: HTMLElement | undefined): Promise<void>
	prefetcher(targets: (HTMLElement | undefined)[]): Promise<void>
	render(target: HTMLElement | undefined): Promise<HTMLDivElement | undefined>
}


export interface IMedia<T extends HTMLElement = HTMLElement> {
	readonly element?: T
	dispose(): void
	load(element?: T, options?: VideoMediaOptions): void | Promise<void>
	pause(): void
	play(): void
	stop(): void
}


export interface IMenu {
	configure(options: OnlyRequired<LightboxOptions, 'index'>): Promise<ArrowGroup>
}


export interface INavigator extends IMenu {
	swapContent(target: LightboxOptions['target']): Promise<void>
}
