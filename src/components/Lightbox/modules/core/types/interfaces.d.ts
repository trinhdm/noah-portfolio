import type { HandlerFor } from '../../../../../services'
import type { LightboxEventMap } from './core.types.d.ts'

import type {
	ArrowDirections,
	ArrowGroup,
	LightboxElements,
	LightboxOptions,
} from '../../../types'


export interface IController {
	close(): Promise<void>
	destroy(): void
	mount(): Promise<void>
	open(): Promise<void>
}


export interface IDispatcher<E = LightboxEventMap> {
	on<K extends keyof E>(event: K, handler: HandlerFor<E, K>): void
	off<K extends keyof E>(event: K, handler: HandlerFor<E, K>): void
	emit<K extends keyof E>(event: K, payload?: E[K]): Promise<void>
	clear<K extends keyof E>(event?: K): void
}


export interface IFactory {
	createRoot({ properties }: LightboxOptions): LightboxElements['root']
}


export interface ILifecycle {
	handleClose(): Promise<void>
	handleDestroy(): void
	handleError({ error, message }: LightboxEventMap['error']): void
	handleMount(options: LightboxOptions): Promise<void>
	handleNavigate(dir: ArrowDirections): Promise<void>
	handleOpen(): Promise<void>
	handleUpdate({ directory, index }: LightboxEventMap['update']): Promise<void>
}


export interface IManager {
	close(): Promise<void>
	open(index?: number): Promise<void>
}
