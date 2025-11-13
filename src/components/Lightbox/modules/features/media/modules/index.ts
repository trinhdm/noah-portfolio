import NativeMedia from './NativeMedia.ts'
import YoutubeMedia from './YoutubeMedia.ts'
import { MediaFactory } from '../MediaFactory.ts'
import type { MediaModule } from '../../types/features.types.d.ts'


const registerLoaders = () => {
	const loaders: Array<() => Promise<{ default: MediaModule<any> }>> = [
		() => import('./NativeMedia'),
		() => import('./YoutubeMedia'),
	]

	for (const loader of loaders) {
		MediaFactory.register(loader)
	}
}


registerLoaders()

MediaFactory.register(NativeMedia)
MediaFactory.register(YoutubeMedia)

// MediaFactory.register(async () => await import('./NativeMedia'))
// MediaFactory.register(async () => await import('./YoutubeMedia'))
