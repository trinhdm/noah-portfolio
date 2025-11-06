import Hls from 'hls.js'
import Plyr from 'plyr'
import type { IDispatcher } from '../../core'
import type { IDOM, IMedia } from '../types/interfaces.d.ts'
import type { LightboxVideoOptions } from '../types/presentation.types.d.ts'


export class LightboxMedia implements IMedia {
	private instance?: Hls | Plyr
	private media?: HTMLIFrameElement | HTMLVideoElement
	private source: string = ''

	private options: Required<LightboxVideoOptions> = {
		controls: true,
		loop: true,
		muted: false,
	}

	constructor(
		private dom: IDOM,
		private dispatch: IDispatcher
	) {}

	private loadNative(element: HTMLVideoElement): void {
		const src = element.src || ''

		for (const option in this.options) {
			const attr = option as keyof typeof this.options

			if (this.options[attr] === true)
				element.setAttribute(attr, '')
			else if (element.hasAttribute(attr))
				element.removeAttribute(attr)
		}

		if (Hls.isSupported()) {
			element.setAttribute('data-native', 'hls')

			try {
				this.instance = new Hls()
				this.instance.loadSource(src)
				this.instance.attachMedia(element)
				console.log('is hls')
			} catch (error) {
				const message = 'LightboxMedia.load() failed on: HLS'
				this.dispatch.emit('error', { error, message })
			}
		} else {
			element.setAttribute('data-native', 'plyr')

			try {
				const plyrOptions: Plyr.Options = {
					muted: this.options.muted,
					loop: { active: this.options.loop },
					tooltips: { controls: this.options.controls },
				}

				this.instance = new Plyr(element, plyrOptions)
				console.log('is plyr')
			} catch (error) {
				const message = 'LightboxMedia.load() failed on: Plyr'
				this.dispatch.emit('error', { error, message })
			}
		}

		console.log('native finish')
	}

	private getYoutubeID(src: string): string {
		const baseURL = src.includes('?') ? src.split('?')[0] : src,
			videoID = baseURL.substring(baseURL.lastIndexOf('/') + 1)

		return videoID
	}

	private loadYoutube(element: HTMLIFrameElement): void {
		let queries = ''
		const src = element.src || '',
			separator = src.includes('?') ? '&' : '?'

		for (const [key, value] of Object.entries(this.options)) {
			let option = key
			switch (key) {
				case 'loop':
					if (value) queries += `${separator}playlist=${this.getYoutubeID(src)}`
					break
				case 'muted': option = 'mute'
					break
			}

			queries += `${separator}${option}=${value ? 1 : 0}`
		}

		element.src += queries
		console.log('iframe finish')
	}

	private set(element: HTMLIFrameElement | HTMLVideoElement) {
		element.setAttribute('autofocus', '')
		this.dom.reset('player')
		this.media = element
		this.source = element.src
	}

	load(options?: LightboxVideoOptions): void {
		this.dispose()

		const player = this.dom.get('player')
		if (!player) return

		this.options = options ? { ...this.options, ...options } : this.options

		if (player instanceof HTMLVideoElement)
			this.loadNative(player)
		else if (player instanceof HTMLIFrameElement)
			this.loadYoutube(player)
		else return

		console.log('set')
		player.setAttribute('autofocus', '')
		this.dom.reset('player')
		this.media = player
		this.source = player.src
	}

	dispose(): void {
		if (this.instance) {
			try { this.instance.destroy?.() }
			catch (error) { this.dispatch.emit('error', {
				error, message: `LightboxMedia.dispose() failed` }) }

			this.instance = undefined
		}

		this.media = undefined
		this.source = ''
	}

	play(): void {
		if (!this.media) return

		if (this.media instanceof HTMLVideoElement && this.media.paused)
			this.media.play().catch(() => {})
		else if (this.media instanceof HTMLIFrameElement)
			this.media.src = `${this.source}&autoplay=1`
	}

	pause(): void {
		if (!this.media) return

		if (this.media instanceof HTMLVideoElement && !this.media.paused)
			this.media.pause()
		else if (this.media instanceof HTMLIFrameElement)
			this.media.src = this.source
	}
}
