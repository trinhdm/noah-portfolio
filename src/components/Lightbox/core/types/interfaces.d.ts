import type { LightboxEventMap } from '@app'

import type {
	ArrowDirections,
	LightboxElements,
	LightboxOptions,
} from '@lightbox/types'


export interface IFactory {
	createRoot({ properties }: LightboxOptions): LightboxElements['root']
}


export interface ILifecycle {
	handleClose(): Promise<void>
	handleDestroy(): void
	handleError({ error, message }: LightboxEventMap['error']): void
	handleMount(): Promise<void>
	handleOpen(): Promise<void>
	handleSwap(dir: ArrowDirections): Promise<void>
	handleUpdate(content?: HTMLElement): Promise<void>
}
