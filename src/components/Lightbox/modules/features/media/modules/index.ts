import NativeMedia from './NativeMedia'
import YoutubeMedia from './YoutubeMedia'
import { MediaFactory } from '../MediaFactory.ts'


MediaFactory.register(async () => await import('./NativeMedia'))
MediaFactory.register(async () => await import('./YoutubeMedia'))

MediaFactory.register(NativeMedia)
MediaFactory.register(YoutubeMedia)
