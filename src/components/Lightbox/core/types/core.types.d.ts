import type { ArrowDirections } from '../../types'


export interface LightboxEventMap {
	close: void
	error: {
		error: unknown
		message?: string
	}
	media: void
	open: void
	swap: ArrowDirections
	update: HTMLElement | undefined
}
