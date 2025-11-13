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

type LightboxStateToggles = 'isActive'

export type StateEventKey = `${LightboxStateEvent}:${StatefulModules}` | LightboxStateToggles


type LightboxStateEvents = {
	[E in LightboxStateEvent as `state:${E}`]: boolean
}

type LightboxChangeState = {
	[K in StateEventKey as `state:${K}`]: { key: string, value: boolean }
}

export type LightboxStateMap = LightboxStateEvents & LightboxChangeState


// type LightboxStateEvent2 = StateEventKey extends `loaded${infer N}` ? N : never
