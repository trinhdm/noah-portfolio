import { LightboxClass } from '../../utils'

import type {
	ArrowDirections,
	ArrowGroup,
	LightboxOptions,
} from '../../types'

import type { Entries } from '../../../../types'
import type { HandlerFor } from '../../../../services'
import type { LightboxEventMap } from './types/core.types.d.ts'
import type { IAnimator, IDOM, IEvents } from '../presentation'
import type { IContent, IMedia, INavigator } from '../features'
import type { IDispatcher, ILifecycle, IState } from './types/interfaces.d.ts'


export class LightboxLifecycle implements ILifecycle {
	private currentIndex: number = 0
	private directory: ArrowGroup = {} as ArrowGroup
	private isActive: boolean = false

	constructor(
		private dom: IDOM,
		private animator: IAnimator,
		private events: IEvents,
		private media: IMedia,
		private navigator: INavigator,
		private content: IContent,
		private dispatch: IDispatcher,
		private state: IState
	) {}

	private async prefetch(directory: ArrowGroup): Promise<void> {
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
			close:		'handleClose',
			error:		'handleError',
			media:		'handleMedia',
			navigate:	'handleNavigate',
			open:		'handleOpen',
			update:		'handleUpdate',
		} as const

		const eventsList = Object.entries(events) as Entries<typeof events>
		for (const [event, method] of eventsList) {
			const handler = this[method].bind(this)
			this.dispatch.on(event, handler as HandlerFor<LightboxEventMap, typeof event>)
		}
	}

	private async initialize({ elements, index, target }: LightboxOptions): Promise<void> {
		if (this.isActive) return
		console.log('init start')

		const content = await this.content.render(target)
		this.dom.setContent(content)
		await this.media.load()

		this.state.update('loaded:Content', true)

		if (elements?.length) {
			let directory = {} as ArrowGroup
			try { directory = await this.navigator.configure(index, elements) }
			finally { await this.handleUpdate({ directory, index }) }
			console.log('end')
		}
	}

	async handleUpdate({ directory, index }: LightboxEventMap['update']): Promise<void> {
		if (!directory) return
		console.log('start update')

		this.currentIndex = index ?? 0
		this.directory = directory

		await this.prefetch(this.directory)
		console.log('finish update')
	}

	async handleMount(options: LightboxOptions): Promise<void> {
		await this.initialize(options)
		this.registerHandlers()
		this.dom.append()
		console.log('appended')

		await this.events.watch([
			this.dom.get('image')?.querySelector('img'),
			this.dom.get('player'),
		])

		this.state.update('loaded:Media', true)
	}

	async handleNavigate(dir: ArrowDirections): Promise<void> {
		if (!this.isActive || !Object.keys(this.directory).length) return
		await this.navigator.swapContent<typeof dir>(this.directory, dir)
	}

	async handleOpen(): Promise<void> {
		if (this.isActive) return
		this.isActive = true
		console.log('open')

		this.dom.toggleDisable()

		// await this.state.pause('loaded:Content')
		this.dom.get('root').showModal()
		this.dom.get('root').parentElement!.style.overflow = 'hidden'
		this.dom.get('container')!.setAttribute('aria-hidden', 'false')

		console.log('fade in')
		await this.animator.Root.fadeIn()
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

		this.dispatch.clear()
		this.media.dispose()
		// this.state.reset()
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

	handleMedia() {
		const player = this.dom.get('player')

		if (player instanceof HTMLVideoElement) {
			if (player.paused) this.media.play()
			else this.media.pause()
		}
	}
}
