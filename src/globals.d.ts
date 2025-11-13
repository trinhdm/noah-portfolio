import Hls from 'hls.js'
import Plyr from 'plyr'


export const GLOBAL_BLOCK_CLASS: string = '.fe-block'

declare global {
	interface Window {
		GLOBAL_BLOCK_CLASS: string
		hls: Hls
		plyr: Plyr
	}
}


export {}
