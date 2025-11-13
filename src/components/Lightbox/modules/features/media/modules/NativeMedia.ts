import Hls from 'hls.js'
import Plyr from 'plyr'
import { BaseMedia } from '../BaseMedia.ts'
import type { VideoMediaOptions } from '../../types/features.types.d.ts'


export class NativeMedia extends BaseMedia<HTMLVideoElement> {
	static isMatch(element: HTMLElement): boolean {
		return element instanceof HTMLVideoElement
	}

	constructor(
		element: HTMLVideoElement,
		options?: VideoMediaOptions
	) {
		super(options)
		this.media = element
	}

	load(): void {
		if (!this.media) return

		this.applyAttributes()

		if (!this.media.src) {
			this.media.src = this.media.getAttribute('data-src') ?? ''
			this.media.removeAttribute('data-src')
			this.media.load()

			this.source = this.media.src
		}

		if (Hls.isSupported()) this.loadHls()
		else this.loadPlyr()
	}

	dispose(): void {
		if (this.instance) this.instance.destroy?.()
		this.instance = undefined
		this.media?.removeAttribute('src')
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

		const hls = new Hls()
		hls.loadSource(this.source)
		hls.attachMedia(this.media)
		// hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
		// 	// console.log('Manifest parsed!', data)
		// 	player.play()
		// 	// setTimeout(() => this.loadPlyr(), 10000)
		// })

		window.hls = hls
		this.instance = hls
	}

	private loadPlyr(): Plyr | undefined {
		if (!this.media) return

		const plyrOptions = this.options
			? {
				muted: this.options.muted,
				loop: { active: this.options.loop },
				tooltips: { controls: this.options.controls },
			} as Partial<Plyr.Options>
			: {}

		const player = new Plyr(this.media, {
			debug:                true,
		})

		this.media.load()
		window.plyr = player
		// Plyr.setup(`#${this.media.id}`, plyrOptions)

		console.log(player)
		console.log('---')
		// console.log(this.media)
		console.log({ id: `#${this.media.id}` })

		return player
	}

	private applyAttributes(): void {
		if (!this.options) return

		for (const [attr, value] of Object.entries(this.options)) {
			if (typeof value === 'string') this.media?.setAttribute(attr, value)
			else if (value === true) this.media?.setAttribute(attr, '')
			else if (this.media?.hasAttribute(attr)) this.media?.removeAttribute(attr)
		}
	}
}


export default NativeMedia
// export const isMatch = NativeMedia.isMatch
