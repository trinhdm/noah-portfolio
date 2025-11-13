import { LightboxDispatcher } from './Dispatcher.ts'
import type { LightboxStateMap, StateEventKey } from './types/core.types.d.ts'
import type { IDispatcher, IState } from './types/interfaces.d.ts'


export class LightboxState implements IState {
	private readonly dispatch: IDispatcher<LightboxStateMap>

	private listeners = new Map<string, ((value: boolean) => void)[]>()
	private store = new Map<string, boolean>()

	constructor() {
		this.dispatch = new LightboxDispatcher<LightboxStateMap>()
	}

	async pause(key: StateEventKey): Promise<void> {
		if (this.get(key)) return Promise.resolve()

		return new Promise<void>(resolve => {
			const existing = this.listeners.get(key) ?? []
			existing.push(() => resolve())
			this.listeners.set(key, existing)
		})
	}

	bind<T extends object>(target: T, prop: string): void {
		const key = prop as StateEventKey,
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

	get(key: StateEventKey): boolean | undefined {
		return this.store.has(key) ? this.store.get(key) : undefined
	}

	subscribe(key: StateEventKey, listener: (...args: any[]) => void): void {
		this.dispatch.once(`state:${key}`, listener)
	}

	update(key: StateEventKey, value: boolean): void {
		if (this.get(key) === value) return

		this.store.set(key, value)
		this.dispatch.emit(`state:${key}`, { key, value })
	}

	reset(): void {
		this.store.clear()
		this.listeners.clear()
	}
}
