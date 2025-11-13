import { LightboxDispatcher } from './Dispatcher.ts'
import type { IDispatcher, IState } from './types/interfaces.d.ts'
import type { LightboxStateKey, LightboxStateMap } from './types/core.types.d.ts'


export class LightboxState implements IState {
	private readonly dispatchState: IDispatcher<LightboxStateMap>

	private store = new Map<string, boolean>()
	private listeners = new Map<string, ((value: boolean) => void)[]>()

	constructor() {
		this.dispatchState = new LightboxDispatcher<LightboxStateMap>()
	}

	bind<T extends object>(target: T, prop: string): void {
		const key = prop as LightboxStateKey,
			initial = this.get(key)

		if (initial !== undefined) (target as any)[key] = initial
		let internal = (target as any)[key]

		Object.defineProperty(target, key, {
			get() { return internal },
			set: (value) => {
				internal = value
				this.update(key, value)
			},
			configurable: true,
		})

		this.subscribe(key, value => (internal = value))
	}

	get(key: LightboxStateKey): boolean | undefined {
		return this.store.has(key) ? this.store.get(key) : undefined
	}

	async pause(key: LightboxStateKey): Promise<void> {
		if (this.get(key)) return Promise.resolve()

		return new Promise<void>(resolve => {
			console.log(`pause ${key}`, this.get(key))

			const existing = this.listeners.get(key) ?? []
			existing.push(() => resolve())
			this.listeners.set(key, existing)
		})
	}

	subscribe(key: LightboxStateKey, listener: (...args: any[]) => void): void {
		this.dispatchState.once(`state:${key}`, listener)
	}

	update(key: LightboxStateKey, value: boolean): void {
		if (this.get(key) === value) return

		this.store.set(key, value)
		this.dispatchState.emit(`state:${key}`, { key, value })
		console.log(`update, ${key}: ${value}`)
	}

	reset(): void {
		this.store.clear()
		this.listeners.clear()
	}
}
