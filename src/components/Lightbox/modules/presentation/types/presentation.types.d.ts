
export type LightboxAnimations = '' | 'in' | 'out' | 'overlay'
export type LightboxStates = 'close' | 'open' | 'swap'

export interface DataValues {
	animate: LightboxAnimations,
	disabled: `${boolean}`,
	state: LightboxStates,
}


interface LightboxSharedVideoOptions {
	controls?: boolean
	loop?: boolean
	muted?: boolean
}

interface LightboxIframeOptions {
	enablejsapi?: boolean
	playlist?: string
}

interface LightboxNativeOptions {
	'data-native'?: 'hls' | 'plyr'
	enablejsapi?: never
	playlist?: never
}

export type LightboxVideoOptions = LightboxSharedVideoOptions & (
	| LightboxIframeOptions
	| LightboxNativeOptions
)
