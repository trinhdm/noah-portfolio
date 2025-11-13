import { BaseMedia } from './BaseMedia.ts'
import { MediaFactory } from './MediaFactory.ts'
import type { IDispatcher } from '../../core'
import type { IDOM } from '../../presentation'
import type { IMedia } from '../types/interfaces.d.ts'
import type { VideoMediaOptions } from '../types/features.types.d.ts'


export class MediaController<T extends HTMLElement = HTMLMediaElement>
implements IMedia<T> {
	private readonly defaults: VideoMediaOptions = {
		controls: true,
		loop: true,
		muted: false,
	}

	private handler?: BaseMedia<T>
	private options: VideoMediaOptions = this.defaults
	private target?: T


	constructor(
		private dom: IDOM,
		private dispatch: IDispatcher
	) {}

	private err(msg: string, error: any) {
		const message = `LightboxMedia.${msg}`
		return this.dispatch.emit('error', { error, message })
	}

	private async create(
		element?: T,
		options?: VideoMediaOptions
	) {
		this.target = (element ? element : this.dom.get('player')) as T
		if (!this.target) return

		this.options = options
			? { ...this.options, ...options }
			: this.options

		// if (document.activeElement !== this.target)
		// 	this.target.setAttribute('autofocus', '')

		this.handler = await MediaFactory.create(this.target, this.options)
		this.dom.reset('player')
	}

	async load(
		element?: T,
		options?: VideoMediaOptions
	): Promise<void> {
		this.dispose()
		await this.create(element, options)

		try { this.handler?.load() }
		catch (err) { this.err('load() failed', err) }
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
}
