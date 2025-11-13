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




interface LightboxLoadStates {
	Content: boolean
	Media: boolean
	Navigator: boolean
}

interface LightboxStates {
	isActive: boolean
	isLoaded: LightboxLoadStates
	isReady: boolean
}

export type LightboxStateEvent = Lowercase<keyof LightboxStates extends `is${infer N}` ? N : never>
type LightboxStateEvents = {
	[E in LightboxStateEvent as `state:${E}`]: boolean
}

export type LightboxStateKey = `${LightboxStateEvent}:${keyof LightboxLoadStates}`
type LightboxStateKeys = {
	[K in LightboxStateKey as `state:${K}`]: boolean
}

type LightboxChangeState = {
	[K in LightboxStateKey as `state:${K}`]: { key: string, value: boolean }
}

export type LightboxStateMap = LightboxStateEvents & LightboxChangeState
