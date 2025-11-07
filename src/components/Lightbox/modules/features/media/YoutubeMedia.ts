import { BaseMedia } from './BaseMedia.ts'
import type { VideoMediaOptions } from '../types/features.types.d.ts'


export class YoutubeMedia extends BaseMedia<HTMLIFrameElement> {
	private readonly ytOptions: VideoMediaOptions = {
		enablejsapi: true,
	}

	private readonly omitParams = ['start']
	private id: string = ''

	constructor(
		media: HTMLIFrameElement,
		options?: VideoMediaOptions
	) {
		super(options)
		this.media = media
		this.id = this.getVideoID(media)
	}

	load(): void {
		if (!this.media) return

		const playlistOption = this.options?.loop ? { playlist: this.id } : {},
			ytOptions = { ...this.ytOptions, ...playlistOption }

		this.update(ytOptions as VideoMediaOptions)

		const baseSrc = this.media.src.split('?')[0],
			parameters = this.createParams(this.media.src)

		this.media.src = `${baseSrc}?${parameters}`
	}

	dispose(): void {}

	pause(): void { this.control('pause') }

	play(): void { this.control('play') }

	stop(): void { this.control('stop') }

	private createParams(src: HTMLIFrameElement['src']) {
		if (!this.options) return ''

		const url = new URL(src, window.location.origin),
			params = url.searchParams

		for (const key of this.omitParams)
			params.delete(key)

		for (const [param, value] of Object.entries(this.options)) {
			let key = param,
				val = `${value ? 1 : 0}`

			if (param === 'muted') key = 'mute'
			if (param === 'playlist') val = `${value}`

			params.set(key, val)
		}

		return params.toString()
	}

	private control(action: 'pause' | 'play' | 'stop') {
		const response = `{"event":"command","func":"${action}Video","args":""}`
		if (this.media) return this.media.contentWindow?.postMessage(response, '*')
	}

	private getVideoID({ src }: HTMLIFrameElement): string {
		const url = src.includes('?') ? src.split('?')[0] : src
		return url.substring(url.lastIndexOf('/') + 1)
	}
}
