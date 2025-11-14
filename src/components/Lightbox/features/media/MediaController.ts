import { BaseMedia } from './BaseMedia.ts'
import { MediaFactory } from './MediaFactory.ts'
import type { IDispatcher } from '../../app'
import type { IDOM } from '../../interface'
import type { IMedia } from '../types/interfaces'
import type { VideoMediaOptions } from '../types/features.types'


export class MediaController<T extends HTMLElement = HTMLMediaElement>
implements IMedia<T> {
	private readonly defaults: VideoMediaOptions = {
		controls: true,
		loop: true,
		muted: false,
	}

	private readonly dispatcher: IDispatcher
	private readonly dom: IDOM

	private handler?: BaseMedia<T>
	private options: VideoMediaOptions = this.defaults
	private target?: T


	constructor(
		protected args: {
			dispatcher: IDispatcher,
			dom: IDOM,
			// options: LightboxOptions,
			// state: IState,
		}
	) {
		this.dispatcher = args.dispatcher
		this.dom = args.dom
	}

	private err(msg: string, error: any) {
		const message = `LightboxMedia.${msg}`
		return this.dispatcher.emit('error', { error, message })
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
