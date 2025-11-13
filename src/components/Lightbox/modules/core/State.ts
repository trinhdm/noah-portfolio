import { LightboxDispatcher } from './Dispatcher'
import type { IDispatcher, IState } from './types/interfaces.d.ts'
import type { LightboxStateEvent, LightboxStateKey, LightboxStateMap, LightboxStates } from './types/core.types.d.ts'


type DeepKeyOf<T extends object> = {
	[K in keyof T]: K extends string
		? T[K] extends object
			? K | DeepKeyOf<T[K]>
			: K
		: never
}[string & keyof T]


export class LightboxState
implements IState {
	private readonly dispatchState: IDispatcher<LightboxStateMap>

	private readonly baseState: LightboxStates = {
		isActive: false,
		isLoaded: {
			Content: false,
			Media: false,
			Navigator: false,
		},
		isReady: false,
	}

	private flags = new Map<string, boolean>()
	private state = new Map<keyof LightboxStates, LightboxStates[keyof LightboxStates]>()

	constructor() {
		this.dispatchState = new LightboxDispatcher<LightboxStateMap>()
		this.state = this.convert(this.baseState)
	}

	private convert(obj: Object) {
		const map = new Map()

		for (const key in obj) {
			const value = obj[key as keyof typeof obj]

			if (typeof value === 'object' && !Array.isArray(value) && value !== null)
				map.set(key, this.convert(value))
			else
				map.set(key, value)
		}

		return map
	}

	private get<K>(path: LightboxStateKey): K | undefined {
		const keys = path.split(':')
		let current = this.state as object | Map<any, any>

		for (const key of keys) {
			if (current === undefined || current === null)
				return undefined

			if (current instanceof Map)
				current = current.get(key)
			else if (typeof current === 'object' && current !== null)
				current = current[key as keyof typeof current]
			else
				return undefined
		}

		return current as K
	}

	private set<K extends DeepKeyOf<LightboxStates>>(path: K[], value: boolean): void {
		if (path.length === 0) return
		let currentMap: Map<any, any> = this.state

		for (let i = 0; i < path.length - 1; i++) {
			const key = path[i]
			let nextMap = currentMap.get(key)

			if (!(nextMap instanceof Map)) {
				nextMap = new Map()
				currentMap.set(key, nextMap)
			}

			currentMap = nextMap
			this.dispatchState.emit(`state:${key as LightboxStateEvent}`, value)
		}

		currentMap.set(path[path.length - 1], value)
	}

	ready(key: keyof LightboxStates['isLoaded']): void {
		this.update(key, true)
		this.set(['isLoaded', key], true)
		this.dispatchState.emit(`state:loaded:${key}`, true)
	}

	subscribe(
		key: LightboxStateKey,
		listener: () => void
	): void {
		this.dispatchState.once(`state:${key}`, listener)
	}

	update(
		key: `loaded:${keyof LightboxStates['isLoaded']}`,
		value: boolean
	) {
		if (this.flags.has(key) && (this.flags.get(key) === value)) return

		this.flags.set(key, value)
		this.dispatchState.emit(`state:${key}`, { key, value })
	}
}
