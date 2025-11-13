import NativeMedia from './NativeMedia'
import YoutubeMedia from './YoutubeMedia'
import { MediaFactory, MediaModule } from '../MediaFactory.ts'


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
