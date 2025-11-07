import Hls from 'hls.js'
import Plyr from 'plyr'
import { BaseMedia } from './BaseMedia.ts'
import type { VideoMediaOptions } from '../types/features.types.d.ts'


export class NativeMedia extends BaseMedia<HTMLVideoElement> {
	constructor(
		media: HTMLVideoElement,
		options?: VideoMediaOptions
	) {
		super(options)
		this.media = media
	}

	load(): void {
		if (!this.media) return

		if (Hls.isSupported()) this.loadHls()
		else this.loadPlyr()

		this.applyAttributes()
	}

	dispose(): void {
		if (this.instance) this.instance.destroy?.()
		this.instance = undefined
	}

	pause(): void { this.media?.pause() }

	play(): void { this.media?.play().catch(() => {}) }

	stop(): void {
		if (!this.media) return
		this.media.pause()
		this.media.currentTime = 0
	}

	private loadHls(): void {
		if (!this.media) return
		this.update({ 'data-native': 'hls' })

		this.instance = new Hls()
		this.instance.loadSource(this.media.src)
		this.instance.attachMedia(this.media)
	}

	private loadPlyr(): void {
		if (!this.media) return
		this.update({ 'data-native': 'plyr' })

		const plyrOptions = this.options
			? {
				muted: this.options.muted,
				loop: { active: this.options.loop },
				tooltips: { controls: this.options.controls },
			} as Partial<Plyr.Options>
			: {}

		this.instance = new Plyr(this.media, plyrOptions)
	}

	private applyAttributes(): void {
		if (!this.options) return

		for (const [attr, value] of Object.entries(this.options)) {
			if (value === true) this.media?.setAttribute(attr, '')
			else if (typeof value === 'string') this.media?.setAttribute(attr, value)
			else if (this.media?.hasAttribute(attr)) this.media?.removeAttribute(attr)
		}
	}
}
