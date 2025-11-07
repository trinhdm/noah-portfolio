import Hls from 'hls.js'
import Plyr from 'plyr'
import type { IDispatcher } from '../../core'
import type { IDOM, IMedia } from '../types/interfaces.d.ts'
import type { LightboxVideoOptions } from '../types/presentation.types.d.ts'


const createMedia = (
	element: HTMLElement,
	options: LightboxVideoOptions | undefined
): NativeMedia | YoutubeMedia | undefined => {
	if (element instanceof HTMLVideoElement)
		return new NativeMedia(element, options)
	if (element instanceof HTMLIFrameElement)
		return new YoutubeMedia(element, options)
}


abstract class BaseMedia<T extends HTMLElement> {
	protected instance?: Hls | Plyr
	protected media?: T

	constructor(protected options?: LightboxVideoOptions) {}

	protected update(opts: LightboxVideoOptions): void {
		this.options = { ...this.options, ...opts }
	}

	abstract load(): void
	abstract dispose(): void
	abstract pause(): void
	abstract play(): void
	abstract stop(): void
}


export class LightboxMedia implements IMedia {
	private handler?: BaseMedia<HTMLIFrameElement | HTMLVideoElement>

	private options: LightboxVideoOptions = {
		controls: true,
		loop: true,
		muted: false,
	}

	constructor(
		private dom: IDOM,
		private dispatch: IDispatcher
	) {}

	load(options?: LightboxVideoOptions): void {
		this.dispose()

		const player = this.dom.get('player')
		if (!player) return

		this.options = options ? { ...this.options, ...options } : this.options

		try {
			this.handler = createMedia(player, this.options)
			this.handler?.load()

			player.setAttribute('autofocus', '')
			this.dom.reset('player')
		} catch (err) { this.err('load() failed', err) }
	}

	dispose(): void {
		try { this.handler?.dispose() }
		catch (err) { this.err('dispose() failed', err) }
		this.handler = undefined
	}

	pause(): void {
		try { this.handler?.pause() }
		catch (err) { this.err('pause() failed', err) }
	}

	play(): void {
		try { this.handler?.play() }
		catch (err) { this.err('play() failed', err) }
	}

	stop(): void {
		try { this.handler?.stop() }
		catch (err) { this.err('stop() failed', err) }
	}

	private err(msg: string, error: any) {
		const message = `LightboxMedia.${msg}`
		return this.dispatch.emit('error', { error, message })
	}
}


class NativeMedia extends BaseMedia<HTMLVideoElement> {
	constructor(
		media: HTMLVideoElement,
		options?: LightboxVideoOptions
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
}


class YoutubeMedia extends BaseMedia<HTMLIFrameElement> {
	private readonly ytOptions: LightboxVideoOptions = {
		enablejsapi: true,
	}

	private readonly omitParams = ['start']
	private id: string = ''

	constructor(
		media: HTMLIFrameElement,
		options?: LightboxVideoOptions
	) {
		super(options)
		this.media = media
		this.id = this.getVideoID(media)
	}

	load(): void {
		if (!this.media) return

		const playlistOption = this.options?.loop ? { playlist: this.id } : {},
			ytOptions = { ...this.ytOptions, ...playlistOption }

		this.update(ytOptions as LightboxVideoOptions)

		const baseSrc = this.media.src.split('?')[0],
			parameters = this.createParams(this.media.src)

		this.media.src = baseSrc + parameters
		console.log({ src: baseSrc + parameters, parameters, })
	}

	pause(): void { this.control('pause') }

	play(): void { this.control('play') }

	stop(): void { this.control('stop') }

	dispose(): void {}

	private createParams(src: HTMLIFrameElement['src']) {
		if (!this.options) return ''

		const url = new URL(src, window.location.origin),
			params = url.searchParams

		for (const key of this.omitParams)
			params.delete(key)

		for (const [param, value] of Object.entries(this.options)) {
			const key = param === 'muted' ? 'mute' : param,
				val = `${value ? 1 : 0}`

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
