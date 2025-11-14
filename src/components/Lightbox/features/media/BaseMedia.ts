import Hls from 'hls.js'
import * as Plyr from 'plyr'
import type { IMedia } from '@features'
import type { VideoMediaOptions } from '../types/features.types'


export abstract class BaseMedia<T extends HTMLElement = HTMLElement>
implements IMedia<T> {
	protected instance?: Hls | Plyr
	protected media?: T
	protected source: string = ''

	constructor(protected options?: VideoMediaOptions) {}

	protected update(opts: VideoMediaOptions): void {
		this.options = { ...this.options, ...opts }
	}

	abstract load(): void | Promise<void>
	abstract dispose(): void
	abstract pause(): void
	abstract play(): void
	abstract stop(): void
}
