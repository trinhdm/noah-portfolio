import { BaseMedia } from './BaseMedia.ts'
import { MediaFactory } from './MediaFactory.ts'
import type { IDispatcher } from '../../core'
import type { IDOM } from '../../presentation'
import type { IMedia } from '../types/interfaces.d.ts'
import type { VideoMediaOptions } from '../types/features.types.d.ts'


export class MediaController implements IMedia<HTMLIFrameElement | HTMLVideoElement> {
	private handler?: BaseMedia<HTMLIFrameElement | HTMLVideoElement>

	private options: VideoMediaOptions = {
		controls: true,
		loop: true,
		muted: false,
	}

	constructor(
		private dom: IDOM,
		private dispatch: IDispatcher
	) {}

	async load(options?: VideoMediaOptions): Promise<void> {
		this.dispose()

		const player = this.dom.get('player')
		if (!player) return

		this.options = options ? { ...this.options, ...options } : this.options

		try {
			this.handler = await MediaFactory.createAsync(player, this.options)

			if (this.handler) {
				await this.handler.load()
				player.setAttribute('autofocus', '')
				this.dom.reset('player')
			}
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
