import Hls from 'hls.js'
import Plyr from 'plyr'

import { findElement, toggleDisableAttr, wrapContent } from '../../utils'
import { AnimationService, ContentService, EventDispatcher } from '../../services'

import type {
	ArrowDirections,
	ArrowGroup,
	DirectoryGroup,
	LightboxElements,
	LightboxEventMap,
	LightboxOptions,
} from './lightbox.types'

import template from './template.ts'


const delay = (value: 'default' | 'pause' | 'swap' | number = 'default') => {
	const buffer = {
		default: 50,
		pause: 500,
		swap: 1000,
	}[value]

	const ms = typeof value === 'string' ? buffer : value
	return new Promise<void>(resolve => setTimeout(resolve, ms))
}

enum LightboxClass {
	Root = 'lightbox',
}

class LightboxDOM {
	// private content: InstanceType<typeof LightboxDOM.Content>
	private cache: Partial<LightboxElements> = {}
	private root: HTMLDivElement

	constructor(
		private options: LightboxOptions,
		private contentService: ContentService
	) {
		this.root = this.createRoot()
		// this.content = new LightboxDOM.Content(this.root, this.contentService)
	}

	// static Content = class {
	// 	constructor(
	// 		private root: HTMLDivElement,
	// 		private contentService: ContentService
	// 	) {}
	// }

	async setContent(target: LightboxOptions['target']): Promise<void> {
		const container = this.root.querySelector('.lightbox__content') as HTMLElement | null
		if (!container) return

		const content = await this.contentService.render(target)
		if (content) container.replaceChildren(...content.children)
		this.resetCache()
	}

	updateContent(newContent: HTMLElement | undefined): void {
		const content = this.get('content')
		if (!content || !newContent) return

		Array.from(content.children).forEach(child => {
			const classes = Array.from(child.classList),
				lbClass = classes.find(cl => cl.includes('lightbox')),
				replacement = newContent.querySelector(`.${lbClass}`)

			if (replacement)
				child.replaceWith(replacement)
			else if (classes.some(cl => cl.includes('temp')))
				child.className = classes.filter(cl => !cl.includes('temp')).join(' ')
		})

		this.resetCache()
	}

	private createRoot(): HTMLDivElement {
		const root = document.createElement('div') as HTMLDivElement

		root.classList.add(LightboxClass.Root)
		root.innerHTML = template

		const { properties } = this.options

		if (properties) {
			const ignore = [
				'innerHTML',
				'innerText',
				'outerHTML',
				'textContent',
			]

			Object.entries(properties).forEach(([prop, value]) => {
				if (!ignore.includes(prop))
					(root as any)[prop] = value
			})
		}

		return root
	}

	append(): void { document.body.appendChild(this.root) }

	remove(): void { this.root.remove() }

	toggleDisable(): void { toggleDisableAttr(this.root) }

	resetCache(): void { this.cache = {} }

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		const root = this.root,
			base = `.${LightboxClass.Root}`

		if (this.cache[key])
			return this.cache[key] as LightboxElements[K]

		const map: Partial<Record<keyof LightboxElements, any>> = {
			root,
			arrows: root.querySelector(`${base}__pagination`)?.querySelectorAll('[data-direction]'),
			blocks: root.querySelectorAll('.fe-block'),
			body: root.querySelector(`${base}__body`),
			closeBtn: root.querySelector(`${base}__close`),
			container: root.querySelector(`${base}__container`),
			content: root.querySelector(`${base}__content`),
			image: root.querySelector(`${base}__image`),
			overlay: root.querySelector(`${base}__overlay`),
			pagination: root.querySelector(`${base}__pagination`),
			video: root.querySelector(`${base}__video`),
		}

		this.cache[key] = (map[key] ?? null) as LightboxElements[K]

		return this.cache[key] as LightboxElements[K]
	}

	setState(state: 'open' | 'change' | 'close'): void {
		this.root.dataset.state = state

		const overflow = {
			change: null,
			close: 'auto',
			open: 'hidden',
		}[state]

		if (!!overflow) document.body.style.overflow = overflow
	}
}

class LightboxAnimation {
	constructor(private dom: LightboxDOM) {}

	private reflow(element: HTMLElement | undefined = this.dom.get('root')): void {
		if (!element) return
		const cls = 'lightbox--animated'
		element.classList.remove(cls)
		void element.offsetHeight		// trigger reflow
		element.classList.add(cls)
	}

	fadeArrows(isActive: boolean): void {
		const arrows =  this.dom.get('arrows')

		if (!arrows?.length) return

		const values = [...arrows as NodeListOf<HTMLDivElement>].map(el => el.dataset.direction),
			directions = isActive ? values : values.reverse()

		directions.forEach((dir, index) => {
			const arrowBtn = [...arrows].find(arrow => (
				arrow.dataset.direction === dir
			))?.querySelector('button')

			if (!arrowBtn) return
			AnimationService.set(arrowBtn as HTMLButtonElement, { index, stagger: .25 })
		})
	}

	fadeBlocks(
		isActive: boolean,
		className: `${LightboxClass.Root}__${string}` = `${LightboxClass.Root}__html`
	): void {
		const blocks = this.dom.get('blocks')
		if (!blocks?.length) return

		const blockList = [...blocks],
			baseDelay = .3,
			stagger = baseDelay * .5

		let blockOrder = isActive ? blockList : blockList.slice().reverse(),
			delay = isActive ? 0 : baseDelay

		blockOrder.filter(block => block.classList.contains(className))
			.forEach((htmlBlock, index) => {
				// const htmlAnimChild = htmlBlock.querySelector('.sqs-html-content') as HTMLElement | undefined,
				const firstChild = htmlBlock.querySelector(':first-child') as HTMLElement | undefined

				if (firstChild?.classList.contains('block--animated')) {
					delay = isActive ? baseDelay : baseDelay * 3
					AnimationService.Pseudo.set(firstChild, { delay, index, stagger })
				}

				AnimationService.set(htmlBlock, { delay, index, stagger })
			})
	}

	async fadeMedia(isAsync: boolean = false) {
		const image = this.dom.get('image'),
			video = this.dom.get('video')

		if (!image || !video) return

		if (isAsync) {
			AnimationService.set(video)
			AnimationService.set(image)

			const imageDelay = parseFloat(image.style.animationDelay),
				videoDelay = parseFloat(video.style.animationDelay),
				mediaToWait = imageDelay >= videoDelay ? image : video

			await this.waitForAnimationEnd(mediaToWait)
		} else {
			AnimationService.set(video)
			await this.waitForAnimationEnd(video)

			AnimationService.set(image)
			await this.waitForAnimationEnd(image)
		}
	}

	async fadeRootIn() {
		this.dom.setState('open')

		this.reflow(this.dom.get('root'))
		await this.waitForAnimationEnd(this.dom.get('body'))

		this.fadeBlocks(true)

		try {
			await AnimationService.wait()
			const blocks = this.dom.get('blocks') ?? [],
				targetBlock = Array.from(blocks).at(-2)

			await this.waitForAnimationEnd(targetBlock)
		} catch (err) {
			console.error('animation failed: lightbox fadeIN', err)
		} finally {
			this.fadeArrows(true)
			await this.fadeMedia?.()
		}
	}

	async fadeRootOut() {
		this.dom.toggleDisable()
		this.dom.setState('close')

		this.reflow(this.dom.get('root'))
		this.fadeArrows(false)

		try {
			await AnimationService.wait()

			const arrows =  this.dom.get('arrows') ?? [],
				[targetArrow] = Array.from(arrows) as HTMLButtonElement[]

			await this.waitForAnimationEnd(targetArrow)
			this.fadeBlocks(false)

			const [firstBlock] = this.dom.get('blocks') ?? []
			await this.waitForAnimationEnd(firstBlock)

			AnimationService.set(this.dom.get('body'))
			AnimationService.set(this.dom.get('container'))

			await this.fadeMedia?.()
		} catch (err) {
			console.error('animation failed: lightbox fadeOUT', err)
		} finally {
			AnimationService.set(this.dom.get('overlay'))
		}
	}

	private getAnimation(target: HTMLElement): { nameAnim: string, totalMs: number } {
		const styles = window.getComputedStyle(target)
		let delay, duration, nameAnim

		;({
			animationDelay: delay,
			animationDuration: duration,
			animationName: nameAnim,
		} = styles)

		duration = parseFloat(styles.animationDuration) || 0
		delay = parseFloat(styles.animationDelay) || 0

		const totalMs = (duration + delay) * 1000

		return { nameAnim, totalMs }
	}

	async waitForAnimationEnd(
		target: HTMLElement | undefined,
		timeoutMs = 50,
		event = 'animationend'
	): Promise<void> {
		if (!target) return

		await new Promise(requestAnimationFrame)
		const { nameAnim, totalMs } = this.getAnimation(target)
		if (!nameAnim || nameAnim === 'none' || totalMs === 0) return

		const bufferTime = totalMs + timeoutMs

		return Promise.race([
			new Promise<void>(resolve => {
				const handleEnd = (evt: Event) => {
					if ((evt as AnimationEvent).target !== target) return
					target.removeEventListener(event, handleEnd)
					resolve()
				}

				target.addEventListener(event, handleEnd, { once: true })
			}),
			delay(bufferTime),
		])
	}
}

class LightboxEvents {
	private handlers: Array<() => void> = []

	constructor(
		private dom: LightboxDOM,
		private dispatcher: EventDispatcher<LightboxEventMap>
	) {}

	private handleClick(element: HTMLElement) {
		if (!element) return
		const handler = async () => await this.dispatcher.emit('close')
		element.addEventListener('click', handler)
		this.handlers.push(() => element.removeEventListener('click', handler))
	}

	bind(): void {
		const closeBtn = this.dom.get('closeBtn'),
			overlay = this.dom.get('overlay')

		if (closeBtn) this.handleClick(closeBtn)
		if (overlay) this.handleClick(overlay)
	}

	unbind(): void {
		this.handlers.forEach(handler => handler())
		this.handlers = []
	}
}

class LightboxMedia {
	private instance: any | undefined = undefined
	private media: HTMLIFrameElement | HTMLVideoElement | undefined = undefined
	private source: string = ''

	constructor(private dom: LightboxDOM) {}

	private init(media: HTMLIFrameElement | HTMLVideoElement): void {
		const source = media.src ?? ''

		if (media instanceof HTMLVideoElement) {
			if (Hls.isSupported()) {
				this.instance = new Hls()

				this.instance.loadSource(source)
				this.instance.attachMedia(media)
				media.pause()
				;(window as any).hls = this.instance

				// this.instance.on(Hls.Events.MANIFEST_PARSED, () => {
				// 	const player = new Plyr(embed, {})
				// 	embed.play()
				// })
			} else {
				new Plyr(media)
				// const player = new Plyr(embed)
			}
		} else if (media instanceof HTMLIFrameElement) {}

		this.media = media
		this.source = source
	}

	configure(): void {
		const video = this.dom.get('video')
		if (!video) return

		const native = video.querySelector('video'),
			youtube = video.querySelector('iframe')

		if (native) this.init(native as HTMLVideoElement)
		else if (youtube) this.init(youtube as HTMLIFrameElement)
	}

	dispose(): void {
		if (this.instance) {
			try {
				this.instance.destroy()
			} catch (err) {}
		}

		this.instance = null
		this.media = undefined
		this.source = ''
	}

	play(): void {
		if (!this.media) return

		if (this.media instanceof HTMLVideoElement)
			this.media.play()
		else if (this.media instanceof HTMLIFrameElement)
			this.media.src = `${this.source}&autoplay=1&mute=1`
	}

	pause(): void {
		if (!this.media) return

		if (this.media instanceof HTMLVideoElement)
			this.media.pause()
		else if (this.media instanceof HTMLIFrameElement)
			this.media.src = this.source
	}
}

class LightboxMenu {
	private data: InstanceType<typeof LightboxMenu.Data>
	private view: InstanceType<typeof LightboxMenu.View>

	constructor(
		private dom: LightboxDOM,
		private elements: LightboxOptions['elements'],
		private contentService: ContentService,
		private dispatcher: EventDispatcher<LightboxEventMap>
	) {
		this.data = new LightboxMenu.Data(this.elements, this.contentService)
		this.view = new LightboxMenu.View(this.dom, this.dispatcher)
	}

	async render(index: number) {
		const directory = await this.data.createDirectory(index)
		this.view.clear()
		this.view.construct(directory)
		await this.data.prefetchAdjacent(index).catch(() => {})

		return directory
	}

	static Data = class {
		constructor(
			private elements: LightboxOptions['elements'],
			private contentService: ContentService
		) {}

		private getPointers(index: number): DirectoryGroup {
			const max = this.elements.length,
				next = index + 1 < max ? index + 1 : 0,
				prev = index - 1 >= 0 ? index - 1 : max - 1

			return {
				current: {
					index,
					target: this.elements[index],
				},
				next: {
					index: next,
					target: this.elements[next],
				},
				prev: {
					index: prev,
					target: this.elements[prev],
				},
			} as DirectoryGroup
		}

		async createDirectory(index: number): Promise<DirectoryGroup> {
			const pointers = this.getPointers(index),
				directions = Object.keys(pointers) as ArrowDirections[]

			const directory = Object.fromEntries(
				await Promise.all(
					directions.map(async dir => {
						const { target: currentTarget, ...rest } = pointers[dir]
						const target = findElement(currentTarget)
						let props: DirectoryGroup[typeof dir] = { ...rest, target }

						if (target) {
							const details = await this.contentService.retrieve(target) ?? {}
							props = { ...props, ...details }
						}

						return [dir, props] as const
					})
				)
			) as DirectoryGroup

			return directory
		}

		async prefetchAdjacent(index: number) {
			const directory = await this.createDirectory(index),
				tasks: Promise<void>[] = []
			const { current, next, prev } = directory

			if (current?.target && current.index === index)
				tasks.push(this.contentService.prefetch(current.target))
			if (next?.target && next.index !== index)
				tasks.push(this.contentService.prefetch(next.target))
			if (prev?.target && prev.index !== index)
				tasks.push(this.contentService.prefetch(prev.target))

			await Promise.allSettled(tasks)
		}
	}

	static View = class {
		private handlers = new Map<HTMLElement, (evt: Event) => void>()

		constructor(
			private dom: LightboxDOM,
			private dispatcher: EventDispatcher<LightboxEventMap>
		) {}

		configure(
			arrow: HTMLElement,
			direction: ArrowDirections
		): HTMLElement | undefined {
			const handler = () => this.dispatcher.emit('navigate', direction)
			arrow.addEventListener('click', handler)
			this.handlers.set(arrow, handler)

			return arrow
		}

		construct(directory: ArrowGroup): void {
			const directions = Object.keys(directory)
				.filter(dir => dir !== 'current')
				.reverse() as ArrowDirections[]

			for (const dir of directions) {
				const arrows = this.dom.get('arrows') ?? [],
					arrow = [...arrows].find(({ dataset }) => dataset.direction === dir)

				if (!arrow) return

				const { index, title } = (directory as ArrowGroup)[dir]
				arrow.setAttribute('data-position', `${index}`)

				const arrowText = arrow.querySelector('.pagination__text')
				if (arrowText && title) {
					const text = wrapContent(title, 'strong')?.innerText
					arrowText.replaceChildren(text ?? '')
				}

				this.configure(arrow, dir)
			}
		}

		clear(): void {
			for (const [arrow, handler] of this.handlers)
				arrow.removeEventListener('click', handler)

			this.handlers = new Map()
		}
	}
}

class LightboxNavigation {
	private isSwapping = false
	private newContent: HTMLElement | undefined = undefined
	private newDirectory: DirectoryGroup = {} as DirectoryGroup

	constructor(
		private dom: LightboxDOM,
		private animator: LightboxAnimation,
		private events: LightboxEvents,
		private media: LightboxMedia,
		private menu: LightboxMenu,
		private contentService: ContentService,
		private dispatcher: EventDispatcher<LightboxEventMap>
	) {}

	private async prepareSwap(target: NonNullable<ArrowGroup['next']['target']>) {
		const currentImage = this.dom.get('image')
		if (!currentImage) return

		try {
			this.newContent = await this.contentService.render(target)
			const newImage = this.newContent?.querySelector('.lightbox__image') as HTMLElement | undefined

			if (newImage) {
				newImage.classList.add('lightbox__temp')
				currentImage.replaceWith(newImage)
			}
		}
		catch (err) { console.error('lightbox failed to close', err) }
		finally {
			this.dom.resetCache()
			await AnimationService.wait()
		}
	}

	private async preSwap() {
		this.media.pause()
		this.dom.toggleDisable()
		this.events.unbind()
		await AnimationService.wait('swap')		// buffer after pausing

		const blocks = this.dom.get('blocks') ?? [],
			targetBlock = Array.from(blocks).at(-1)

		this.dom.setState('change')
		this.animator.fadeBlocks(false)

		await this.animator.waitForAnimationEnd(targetBlock)
		await this.animator.fadeMedia?.(true)

		requestAnimationFrame(() => {
			setTimeout(() => (this.media.dispose()), 0)
		})

		await AnimationService.wait()
	}

	private async performSwap() {
		const image = this.dom.get('image')!,
			{ animationName } = image.style

		this.dom.updateContent(this.newContent)
		this.media.configure()
		image.style.animationName = 'none'

		this.dom.setState('open')
		this.animator.fadeBlocks(true)
		await AnimationService.wait()

		const blocks = this.dom.get('blocks') ?? [],
			targetBlock = Array.from(blocks).at(-1)

		await this.animator.waitForAnimationEnd(targetBlock)

		requestAnimationFrame(() => {
			setTimeout(() => (image.style.animationName = animationName), 0)
		})

		await AnimationService.wait()
		await this.animator.fadeMedia?.()
	}

	private async postSwap(newIndex: number) {
		this.newDirectory = await this.menu.render(newIndex)

		this.media.play()
		this.events.bind()
		this.dom.toggleDisable()
	}

	async swapContent<T extends ArrowDirections>(
		directory: ArrowGroup,
		dir: T
	) {
		if (this.isSwapping) return
		this.isSwapping = true

		const {
			index: newIndex,
			target: newTarget,
		} = directory[dir]

		if (!newTarget) {
			await this.dispatcher.emit('close')
			return
		}

		try {
			await this.prepareSwap(newTarget)
			await this.preSwap()
			await this.performSwap()
			await this.postSwap(newIndex)
		}
		catch (err) { console.error('lightbox swap failed', err) }
		finally {
			this.isSwapping = false
			return { directory: this.newDirectory, index: newIndex }
		}
	}
}

export class LightboxController {
	private readonly dom: LightboxDOM
	private readonly menu: LightboxMenu
	private readonly animator: LightboxAnimation
	private readonly events: LightboxEvents
	private readonly media: LightboxMedia
	private readonly navigator: LightboxNavigation

	private readonly contentService: ContentService
	private readonly dispatcher: EventDispatcher<LightboxEventMap>
	private currentIndex: number = 0
	private directory: DirectoryGroup = {} as DirectoryGroup
	private elements: LightboxOptions['elements'] = []
	private isActive: boolean = false

	constructor(private options: LightboxOptions) {
		this.contentService = new ContentService()
		this.dispatcher = new EventDispatcher()

		this.dom = new LightboxDOM(this.options, this.contentService)
		this.media = new LightboxMedia(this.dom)
		this.menu = new LightboxMenu(this.dom, this.options.elements, this.contentService, this.dispatcher)
		this.events = new LightboxEvents(this.dom, this.dispatcher)

		this.animator = new LightboxAnimation(this.dom)
		this.navigator = new LightboxNavigation(
			this.dom,
			this.animator,
			this.events,
			this.media,
			this.menu,
			this.contentService,
			this.dispatcher
		)

		this.dom.append()
		this.registerDefaultHandlers()
		void this.dispatcher.emit('ready', this.options)
	}

	private registerDefaultHandlers(): void {
		this.dispatcher.on('ready', this.handleInit.bind(this))
		this.dispatcher.on('open', this.handleOpen.bind(this))
		this.dispatcher.on('close', this.handleClose.bind(this))
		this.dispatcher.on('navigate', this.handleSwap.bind(this))
	}

	private async handleInit({ elements, index, target }: LightboxOptions) {
		this.currentIndex = index ?? 0
		this.elements = elements ?? []

		await this.dom.setContent(target)
		this.media.configure()

		if (!!elements?.length)
			this.directory = await this.menu.render(this.currentIndex)
	}

	private async handleSwap(dir: ArrowDirections) {
		if (!this.isActive || !Object.keys(this.directory).length) return
		this.dispatcher.emit('swap:start', { direction: dir, index: this.currentIndex })

		const result = await this.navigator.swapContent<typeof dir>(this.directory, dir)

		if (result) {
			this.currentIndex = result.index
			this.directory = result.directory
		}

		this.dispatcher.emit('swap:finish', { direction: dir, index: this.currentIndex })
	}

	private async handleOpen() {
		if (this.isActive) return
		this.isActive = true

		try {
			this.dom.toggleDisable()
			await AnimationService.wait()				// buffer for image.maxHeight
			await this.animator.fadeRootIn()
			this.media.play()

			const arrows = this.dom.get('arrows') ?? [],
				targetArrow = Array.from(arrows).at(-2) as HTMLButtonElement

			await this.animator.waitForAnimationEnd(targetArrow)
		}
		catch (err) { console.error('lightbox failed to open', err) }
		finally {
			this.events.bind()
			this.dom.toggleDisable()
		}
	}

	private async handleClose() {
		if (!this.isActive) return
		this.isActive = false

		try {
			this.media.pause()
			this.events.unbind()

			await AnimationService.wait('pause')		// buffer after pausing
			await this.animator.fadeRootOut()
			await this.animator.waitForAnimationEnd(this.dom.get('overlay'))
		}
		catch (err) { console.error('lightbox failed to close', err) }
		finally { this.destroy() }
	}

	async open() { await this.dispatcher.emit('open') }

	async close() { await this.dispatcher.emit('close') }

	async toggle() { await (this.isActive ? this.close() : this.open()) }

	destroy(): void {
		this.media.dispose()
		this.dom.remove()
		this.dispatcher.clear()
	}
}
