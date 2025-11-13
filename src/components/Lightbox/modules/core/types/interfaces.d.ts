import type { HandlerFor } from '../../../../../services'

import type {
	ArrowDirections,
	LightboxElements,
	LightboxOptions,
} from '../../../types'

import type {
	LightboxEventMap,
	LightboxStateKey,
	LightboxStateMap,
} from './core.types.d.ts'


export interface IController {
	close(): Promise<void>
	destroy(): void
	mount(): Promise<void>
	open(): Promise<void>
}


export interface IDispatcher<E extends LightboxEventMap | LightboxStateMap = LightboxEventMap> {
	off<K extends keyof E>(event: K, handler: HandlerFor<E, K>): void
	on<K extends keyof E>(event: K, handler: HandlerFor<E, K>): void
	once<K extends keyof E>(event: K, handler: HandlerFor<E, K>): void
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
	handleOpen(): Promise<void>
	handleSwap(dir: ArrowDirections): Promise<void>
}


export interface IManager {
	close(): Promise<void>
	open(index?: number): Promise<void>
}


export interface IState {
	bind<T extends object>(
		target: T, prop: string
	): void
	get(key: LightboxStateKey): boolean | undefined
	pause(key: LightboxStateKey): Promise<void>
	reset(): void
	subscribe(
		key: LightboxStateKey, listener: (...args: any) => void
	): void
	update(key: LightboxStateKey, value: boolean): void
}
