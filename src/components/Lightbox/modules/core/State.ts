import { LightboxDispatcher } from './Dispatcher'
import type { IDispatcher, IState } from './types/interfaces.d.ts'
import type { LightboxStateKey, LightboxStateMap, ModuleLoadStates } from './types/core.types.d.ts'


export class LightboxState implements IState {
	private readonly dispatchState: IDispatcher<LightboxStateMap>

	private flags = new Map<string, boolean>()
	private waiters = new Map<string, ((value: boolean) => void)[]>()

	constructor() {
		this.dispatchState = new LightboxDispatcher<LightboxStateMap>()
	}

	private get(key: LightboxStateKey): boolean | undefined {
		return this.flags.has(key) ? this.flags.get(key) : undefined
	}

	async pause(key: LightboxStateKey): Promise<void> {
		if (this.get(key)) return Promise.resolve()

		return new Promise<void>(resolve => {
			console.log(`pause ${key}`, this.get(key))

			const existing = this.waiters.get(key) ?? []
			existing.push(() => resolve())
			this.waiters.set(key, existing)
		})
	}

	subscribe(key: LightboxStateKey, listener: () => void): void {
		this.dispatchState.once(`state:${key}`, listener)
	}

	update(key: `loaded:${keyof ModuleLoadStates}`, value: boolean): void {
		if (this.get(key) === value) return

		this.flags.set(key, value)
		this.dispatchState.emit(`state:${key}`, { key, value })
		console.log(`update, ${key}: ${value}`)
	}

	reset(): void {
		this.flags.clear()
		this.waiters.clear()
	}
}
