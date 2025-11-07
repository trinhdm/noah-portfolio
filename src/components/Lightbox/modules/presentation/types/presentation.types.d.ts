
export type LightboxAnimations = '' | 'in' | 'out' | 'overlay'
export type LightboxStates = 'close' | 'open' | 'swap'

export interface DataValues {
	animate: LightboxAnimations,
	disabled: `${boolean}`,
	state: LightboxStates,
}
