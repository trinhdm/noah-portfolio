import type { ArrowDirections, ArrowGroup } from '../../../types'


export interface LightboxEventMap {
	close: void
	error: {
		error: unknown
		message?: string
	}
	media: void
	navigate: ArrowDirections
	open: void
	update: {
		directory?: ArrowGroup
		index: number
	}
}




interface ModuleLoadStates {
	Content: boolean
	Media: boolean
	Navigator: boolean
}


export type LightboxStateEvent = 'active' | 'inactive' | 'loaded'

type LightboxStateEvents = {
	[E in LightboxStateEvent as `state:${E}`]: boolean
}

export type LightboxStateKey = `${LightboxStateEvent}:${keyof ModuleLoadStates}`
type LightboxStateKeys = {
	[K in LightboxStateKey as `state:${K}`]: boolean
}

type LightboxChangeState = {
	[K in LightboxStateKey as `state:${K}`]: { key: string, value: boolean }
}

export type LightboxStateMap = LightboxStateEvents & LightboxChangeState



type LightboxStateEvent2 = LightboxStateKey extends `loaded${infer N}` ? N : never
