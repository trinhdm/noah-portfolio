import { LightboxAnimator, LightboxDOM, LightboxEvents } from '../presentation'
import { LightboxClass } from '../../utils'

import {
	LightboxContent,
	LightboxMedia,
	LightboxMenu,
	LightboxNavigator,
} from '../features'

import type {
	ArrowDirections,
	ArrowGroup,
	LightboxDispatcher,
	LightboxEventMap,
	LightboxOptions,
} from '../../types'

import type { Entries } from '../../../../types'
import type { HandlerFor } from '../../../../services'


export class LightboxLifecycle {
	private currentIndex: number = 0
	private directory: ArrowGroup = {} as ArrowGroup
	private isActive: boolean = false
	private isReady: Promise<void> | null = null

	constructor(
		private dom: LightboxDOM,
		private animator: LightboxAnimator,
		private events: LightboxEvents,
		private media: LightboxMedia,
		private menu: LightboxMenu,
		private navigator: LightboxNavigator,
		private content: LightboxContent,
		private dispatch: LightboxDispatcher
	) {}

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

	private async prefetch(directory: ArrowGroup) {
		if (!this.isActive || !Object.keys(this.directory).length) return

		const adjTargets = Object.values(directory).map(v => v.target)
			.filter(Boolean) as HTMLElement[]

		if (!adjTargets.length) return
		await this.content.prefetcher(adjTargets).catch(error => (
			this.dispatch.emit('error', { error, message: 'Lifecycle.prefetch() failed' })
		))
	}

	private registerHandlers(): void {
		const events: Record<keyof LightboxEventMap, keyof LightboxLifecycle> = {
			close: 'handleClose',
			error: 'handleError',
			navigate: 'handleNavigate',
			open: 'handleOpen',
			update: 'handleUpdate',
		} as const

		const eventsList = Object.entries(events) as Entries<typeof events>
		for (const [event, method] of eventsList) {
			const handler = this[method].bind(this)
			this.dispatch.on(event, handler as HandlerFor<LightboxEventMap, typeof event>)
		}
	}

	private async initialize({ elements, index, target }: LightboxOptions) {
		if (this.isActive) return

		this.isReady = (async () => {
			await this.dom.setContent(target)
			this.media.load()
		})()

		if (elements?.length) await this.handleUpdate(index, elements)
	}

	async handleUpdate(
		index: number,
		elements?: LightboxOptions['elements']
	) {
		this.currentIndex = index ?? 0

		try {
			const directory = await this.menu.configure(this.currentIndex, elements)
			this.directory = directory
		} catch (error) {
			this.dispatch.emit('error', { error, message: 'Lifecycle.handleUpdate() failed' })
		} finally { await this.prefetch(this.directory) }
	}

	async handleMount(options: LightboxOptions) {
		await this.initialize(options)
		this.registerHandlers()
		this.dom.append()
	}

	async handleNavigate(dir: ArrowDirections) {
		if (!this.isActive || !Object.keys(this.directory).length) return
		await this.navigator.swapContent<typeof dir>(this.directory, dir)
	}

	async handleOpen() {
		if (this.isActive) return
		this.isActive = true

		this.dom.toggleDisable()
		await this.isReady

		this.dom.get('root').showModal()
		this.dom.get('root').parentElement!.style.overflow = 'hidden'
		this.dom.get('container')!.setAttribute('aria-hidden', 'false')

		await this.animator.Root.fadeIn()
		this.media.play()
		this.events.bind()

		this.dom.toggleIcons()
		this.dom.toggleDisable()
	}

	async handleClose() {
		if (!this.isActive) return
		this.isActive = false

		this.dom.toggleDisable()
		this.dom.toggleIcons()

		this.media.pause()
		this.events.unbind()
		await this.animator.Root.fadeOut()

		this.dom.get('container')!.setAttribute('aria-hidden', 'true')
		this.dom.get('root').parentElement!.style.overflow = 'auto'
		this.dom.get('root').close()

		this.handleDestroy()
	}

	handleDestroy(): void {
		this.currentIndex = 0
		this.directory = {} as ArrowGroup
		this.isActive = false
		this.isReady = null

		this.dispatch.clear()
		this.media.dispose()
		this.dom.remove()
	}
}
