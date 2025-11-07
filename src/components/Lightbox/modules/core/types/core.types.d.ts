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
