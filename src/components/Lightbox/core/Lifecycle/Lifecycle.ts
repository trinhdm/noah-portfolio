import { LightboxClass } from '../../utils'
import type { ArrowGroup, LightboxOptions } from '@lightbox/types'
import type { Entries } from '../../../../types'
import type { HandlerFor } from '../../../../services'
import type { IAnimator, IDOM, IEvents } from '@interface'
import type { IContent, IMedia, INavigator } from '@features'
import type { IDispatcher, IState, LightboxEventMap } from '@app'
import type { ILifecycle } from '@core'


export class LightboxLifecycle implements ILifecycle {
	protected readonly animator: IAnimator
	protected readonly content: IContent
	protected readonly dispatcher: IDispatcher
	protected readonly dom: IDOM
	protected readonly events: IEvents
	protected readonly media: IMedia
	protected readonly navigator: INavigator
	protected readonly state: IState
	protected readonly options: LightboxOptions = {} as LightboxOptions

	private currentIndex: number = 0
	private directory?: ArrowGroup
	private isActive: boolean = false

	constructor(
		protected args: {
			animator: IAnimator,
			content: IContent,
			dispatcher: IDispatcher,
			dom: IDOM,
			events: IEvents,
			media: IMedia,
			navigator: INavigator,
			options: LightboxOptions,
			state: IState,
		}
	) {
		this.animator = args.animator
		this.content = args.content
		this.dispatcher = args.dispatcher
		this.dom = args.dom
		this.events = args.events
		this.media = args.media
		this.navigator = args.navigator
		this.options = args.options
		this.state = args.state

		this.state.bind(this, 'isActive')
	}

	async handleMount(): Promise<void> {
		if (this.isActive) return
		const { index, target } = this.options

		this.dom.append()
		this.registerHandlers()

		await Promise.all([
			this.getContent(target),
			this.getDirectory(index),
		])
	}

	async handleOpen(): Promise<void> {
		if (this.isActive) return
		this.isActive = true

		this.dom.toggleDisable()
		// await this.state.pause('loaded:Content')

		this.dom.get('root').showModal()
		this.dom.get('root').parentElement!.style.overflow = 'hidden'
		this.dom.get('container')!.setAttribute('aria-hidden', 'false')

		await this.animator.fadeIn()
		this.media.play()
		this.events.bind()

		this.dom.toggleIcons()
		this.dom.toggleDisable()
	}

	async handleClose(): Promise<void> {
		if (!this.isActive) return
		this.isActive = false

		this.dom.toggleDisable()
		this.dom.toggleIcons()

		this.media.stop()
		this.events.unbind()
		await this.animator.fadeOut()

		this.dom.get('container')!.setAttribute('aria-hidden', 'true')
		this.dom.get('root').parentElement!.style.overflow = 'auto'
		this.dom.get('root').close()

		this.handleDestroy()
	}

	async handleSwap(dir: keyof ArrowGroup): Promise<void> {
		if (!this.isActive || !this.directory) return

		const { index, target } = this.directory[dir]
		await Promise.all([
			this.navigator.swapContent(target),
			new Promise(res => setTimeout(() => res(this.getDirectory(index)), 1000)),
		])
	}

	async handleUpdate(content?: HTMLElement): Promise<void> {
		this.dom.setContent(content)
		this.state.update('loaded:Content', true)

		await Promise.all([
			this.media.load(),
			this.events.watch([
				this.dom.get('image')?.querySelector('img'),
				this.dom.get('player'),
			]),
		])
		this.state.update('loaded:Media', true)

		// await this.media.load()
		// await this.events.watch([
		// 	this.dom.get('image')?.querySelector('img'),
		// 	this.dom.get('player'),
		// ])
	}

	handleDestroy(): void {
		this.currentIndex = 0
		this.directory = undefined
		this.isActive = false

		this.dispatcher.clear()
		this.media.dispose()
		this.dom.remove()
	}

	handleError({
		error,
		message = 'Something went wrong with the lightbox.'
	}: LightboxEventMap['error']): void {
		const container = document.createElement('div'),
			wrapper = document.createElement('span')

		wrapper.textContent = message
		container.classList.add(LightboxClass.Error)
		container.appendChild(wrapper)

		this.dom.get('footer')?.appendChild(container)
		console.error(`[Lightbox Error]: ${message}\n`, error)
	}

	handleMedia(): void {
		const player = this.dom.get('player')

		if (player instanceof HTMLVideoElement) {
			if (player.paused) this.media.play()
			else this.media.pause()
		}
	}

	private registerHandlers(): void {
		const eventMap = {
			close:	'handleClose',
			error:	'handleError',
			media:	'handleMedia',
			open:	'handleOpen',
			swap:	'handleSwap',
			update:	'handleUpdate',
		} as const

		const events = Object.entries(eventMap) as Entries<typeof eventMap>
		for (const [event, method] of events) {
			const handler = this[method].bind(this)
			this.dispatcher.on(event, handler as HandlerFor<LightboxEventMap, typeof event>)
		}
	}

	private async getContent(target: LightboxOptions['target']): Promise<void> {
		const content = await this.content.render(target)
		await this.handleUpdate(content)
	}

	private async getDirectory(index: LightboxOptions['index']): Promise<void> {
		const base = { index },
			config = this.directory ? base : Object.assign(this.options, base),
			directory = await this.navigator.configure(config)

		this.currentIndex = index
		this.directory = directory

		await this.prefetch(this.directory)
		this.state.update('loaded:Navigator', true)
	}

	private async prefetch(directory?: ArrowGroup): Promise<void> {
		if (!this.isActive || !directory) return

		const adjTargets = Object.values(directory).map(v => v.target).filter(Boolean)
		if (!adjTargets.length) return

		await this.content.prefetcher(adjTargets).catch(error => (
			this.dispatcher.emit('error', { error, message: 'Lifecycle.prefetch() failed' })
		))
	}
}
