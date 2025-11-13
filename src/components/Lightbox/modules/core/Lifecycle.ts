import { LightboxClass } from '../../utils'
import type { ArrowGroup, LightboxOptions } from '../../types'
import type { Entries } from '../../../../types'
import type { HandlerFor } from '../../../../services'
import type { LightboxEventMap } from './types/core.types.d.ts'
import type { IAnimator, IDOM, IEvents } from '../presentation'
import type { IContent, IMedia, INavigator } from '../features'
import type { IDispatcher, ILifecycle, IState } from './types/interfaces.d.ts'


export class LightboxLifecycle implements ILifecycle {
	private currentIndex: number = 0
	private directory?: ArrowGroup
	private isActive: boolean = false
	private options: LightboxOptions = {} as LightboxOptions

	constructor(
		private dom: IDOM,
		private animator: IAnimator,
		private events: IEvents,
		private media: IMedia,
		private navigator: INavigator,
		private content: IContent,
		private dispatch: IDispatcher,
		private state: IState
	) {
		this.state.bind(this, 'isActive')
	}

	async handleMount(options: LightboxOptions): Promise<void> {
		if (this.isActive) return

		this.options = options
		this.dom.append()
		this.registerHandlers()

		const { index, target } = this.options
		await Promise.all([
			this.getContent(target),
			this.getDirectory(index),
		])
	}

	async handleOpen(): Promise<void> {
		if (this.isActive) return
		this.isActive = true

		this.dom.toggleDisable()
		await this.state.pause('loaded:Content')

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

	handleDestroy(): void {
		this.currentIndex = 0
		this.directory = undefined
		this.isActive = false

		this.dispatch.clear()
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
		} as const

		const events = Object.entries(eventMap) as Entries<typeof eventMap>
		for (const [event, method] of events) {
			const handler = this[method].bind(this)
			this.dispatch.on(event, handler as HandlerFor<LightboxEventMap, typeof event>)
		}
	}

	private async getContent(target: LightboxOptions['target']): Promise<void> {
		const content = await this.content.render(target)
		this.dom.setContent(content)
		this.state.update('loaded:Content', true)

		await this.media.load()
		await this.events.watch([
			this.dom.get('image')?.querySelector('img'),
			this.dom.get('player'),
		])
		this.state.update('loaded:Media', true)
	}

	private async getDirectory(index: LightboxOptions['index']): Promise<void> {
		const base = { index },
			config = this.directory ? base : Object.assign(this.options, base)

		this.currentIndex = index
		this.directory = await this.navigator.configure(config)

		await this.prefetch(this.directory)
		this.state.update('loaded:Navigator', true)
	}

	private async prefetch(directory?: ArrowGroup): Promise<void> {
		if (!this.isActive || !directory) return

		const adjTargets = Object.values(directory).map(v => v.target).filter(Boolean)
		if (!adjTargets.length) return

		await this.content.prefetcher(adjTargets).catch(error => (
			this.dispatch.emit('error', { error, message: 'Lifecycle.prefetch() failed' })
		))
	}
}
