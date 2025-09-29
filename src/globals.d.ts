import Hls from 'hls.js'


export const GLOBAL_BLOCK_CLASS: string = '.fe-block'

declare global {
	interface Window {
		hls: Hls
		GLOBAL_BLOCK_CLASS: string
	}
}


export {}
