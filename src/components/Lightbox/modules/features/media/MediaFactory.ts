import { NativeMedia } from './NativeMedia.ts'
import { YoutubeMedia } from './YoutubeMedia.ts'
import type { VideoMediaOptions } from '../types/features.types.d.ts'


export const createMedia = (
	element: HTMLElement,
	options: VideoMediaOptions | undefined
): NativeMedia | YoutubeMedia | undefined => {
	if (element instanceof HTMLVideoElement)
		return new NativeMedia(element, options)
	if (element instanceof HTMLIFrameElement)
		return new YoutubeMedia(element, options)
}
