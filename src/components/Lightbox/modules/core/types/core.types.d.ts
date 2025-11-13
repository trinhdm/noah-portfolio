import type { ArrowDirections } from '../../../types'


export interface LightboxEventMap {
	close: void
	error: {
		error: unknown
		message?: string
	}
	media: void
	open: void
	swap: ArrowDirections
}


type StatefulModules = 'Content' | 'Media' | 'Navigator' | 'Root'

type LightboxStateEvent = 'active' | 'loaded'

type LightboxStateEvents = {
	[E in LightboxStateEvent as `state:${E}`]: boolean
}

type LightboxStateToggles = 'isActive'

export type LightboxStateKey = `${LightboxStateEvent}:${StatefulModules}` | LightboxStateToggles


type LightboxStateKeys = {
	[K in LightboxStateKey as `state:${K}`]: boolean
}

type LightboxChangeState = {
	[K in LightboxStateKey as `state:${K}`]: { key: string, value: boolean }
}

export type LightboxStateMap = LightboxStateEvents & LightboxChangeState



type LightboxStateEvent2 = LightboxStateKey extends `loaded${infer N}` ? N : never
