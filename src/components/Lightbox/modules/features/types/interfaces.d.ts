import type { BlockHandler } from './features.types.d.ts'
import type { BlockTypes, PageDetails } from '../../../../../types'

import type {
	ArrowDirections,
	ArrowGroup,
	LightboxOptions,
} from '../../../types'


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
	// readonly media?: T
	dispose(): void
	load(options?: LightboxVideoOptions): void
	pause(): void
	play(): void
	stop(): void
}


export interface IMenu {
	configure(
		index: number,
		elements?: LightboxOptions['elements']
	): Promise<ArrowGroup>
}


export interface INavigator extends IMenu {
	swapContent<T extends ArrowDirections>(
		directory: ArrowGroup,
		dir: T
	): Promise<void>
}
