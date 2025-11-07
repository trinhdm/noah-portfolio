import Hls from 'hls.js'
import Plyr from 'plyr'
import type { IMedia } from '../types/interfaces.d.ts'
import type { VideoMediaOptions } from '../types/features.types.d.ts'


export abstract class BaseMedia<T extends HTMLElement = HTMLElement>
implements IMedia<T> {
	protected instance?: Hls | Plyr
	protected media?: T

	constructor(protected options?: VideoMediaOptions) {}

	protected update(opts: VideoMediaOptions): void {
		this.options = { ...this.options, ...opts }
	}

	abstract load(): void
	abstract dispose(): void
	abstract pause(): void
	abstract play(): void
	abstract stop(): void
}
