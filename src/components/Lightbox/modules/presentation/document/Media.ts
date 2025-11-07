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
			} catch (error) {
				const message = 'LightboxMedia.load() failed on: Plyr'
				this.dispatch.emit('error', { error, message })
			}
		}
	}

	private getYoutubeID(src: string): string {
		const url = src.includes('?') ? src.split('?')[0] : src,
			id = url.substring(url.lastIndexOf('/') + 1)

		return id
	}

	private createParam(src: string, [param, value]: [string, boolean | number | string]) {
		const separator = src.includes('?') ? '&' : '?'
		return `${separator}${param}=${value}`
	}

	private getParams(src: string) {
		const srcId = this.getYoutubeID(src)
		let queries = ''

		for (const [key, value] of Object.entries(this.options)) {
			let option = key
			switch (key) {
				case 'loop':
					if (value) queries += this.createParam(src, ['playlist', srcId])
					break
				case 'muted': option = 'mute'
					break
			}

			queries += this.createParam(src, [option, value ? 1 : 0])
		}

		return queries
	}

	private replaceParams(src: string, params: Record<string, number | string>) {
		let url = src

		for (const [param, value] of Object.entries(params)) {
			const regex = new RegExp(`([?&])${param}=[^&]*`, 'g')
			if (!url.match(regex)) continue

			const parameter = this.createParam(url, [param, value])
			let i: number | null = null

			url = url.replace(regex, (match, p1, index) => {
				if (match.startsWith('?')) i = index
				return value ? `${p1}${parameter.slice(1)}` : ''
			})

			if (i && url[i] === '&')
				url = url.substring(0, i) + '?' + url.substring(i + 1)
		}

		return url
	}

	private controlYoutube(action: 'pause' | 'play' | 'stop') {
		const response = `{"event":"command","func":"${action}Video","args":""}`
		return (this.media as HTMLIFrameElement)?.contentWindow?.postMessage(response, '*')
	}

	private loadYoutube(element: HTMLIFrameElement): void {
		const src = element.src || ''
		let newSrc = this.replaceParams(src, { start: '' })
		newSrc += this.createParam(src, ['enablejsapi', 1])
		newSrc += this.getParams(newSrc)

		element.src = newSrc
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

	pause(): void {
		if (!this.media) return

		if (this.media instanceof HTMLVideoElement && !this.media.paused)
			this.media.pause()
		else if (this.media instanceof HTMLIFrameElement)
			this.controlYoutube('pause')
	}

	play(): void {
		if (!this.media) return

		if (this.media instanceof HTMLVideoElement && this.media.paused)
			this.media.play().catch(() => {})
		else if (this.media instanceof HTMLIFrameElement)
			this.controlYoutube('play')
	}

	stop(): void {
		if (!this.media) return

		if (this.media instanceof HTMLVideoElement && !this.media.paused) {
			this.media.pause()
			this.media.currentTime = 0
		} else if (this.media instanceof HTMLIFrameElement) {
			this.controlYoutube('stop')
		}
	}
}
