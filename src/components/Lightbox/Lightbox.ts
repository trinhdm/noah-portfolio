import Hls from 'hls.js'
import Plyr from 'plyr'

import { toggleDisableAttr, wrapContent } from '../../utils'
import { LightboxContentService } from './LightboxContentService.ts'

import {
	AnimationService as Animation,
	EventDispatcher,
} from '../../services'

import {
	LightboxBlockSelector,
	LightboxClass,
	LightboxSelector,
} from './data'

import type {
	ArrowDirections,
	ArrowGroup,
	LightboxElements,
	LightboxEventMap,
	LightboxOptions,
	LightboxStates,
} from './lightbox.types'

import template from './template.ts'


class LightboxFactory {
	private root: HTMLDivElement

	constructor(private options: LightboxOptions) {
		this.root = this.createRoot()
	}

	createRoot(): HTMLDivElement {
		const root = document.createElement('div')

		root.classList.add(LightboxClass.Root)
		root.innerHTML = template

		const { properties } = this.options
		if (properties) {
			const ignore = ['innerHTML', 'innerText', 'outerHTML', 'textContent']

			Object.entries(properties).forEach(([prop, value]) => {
				if (!ignore.includes(prop)) root.setAttribute(prop, `${value}`)
			})
		}

		return root
	}
}

class LightboxCache {
	private cache: Partial<Record<keyof LightboxElements, any>> = {}
	private map: Partial<LightboxElements> = {}

	constructor(private root: HTMLElement) {
		this.build()
	}

	private build(): void {
		const root = this.root
		const map: Record<keyof LightboxElements, any> = {
			root,
			arrows: root.querySelector(LightboxSelector.Navigation)?.querySelectorAll('[data-direction]'),
			blocks: root.querySelectorAll(LightboxBlockSelector.Block),
			body: root.querySelector(LightboxSelector.Body),
			close: root.querySelector(LightboxSelector.Close),
			container: root.querySelector(LightboxSelector.Container),
			content: root.querySelector(LightboxSelector.Content),
			footer: root.querySelector(LightboxSelector.Footer),
			header: root.querySelector(LightboxSelector.Header),
			image: root.querySelector(LightboxSelector.Image),
			navigation: root.querySelector(LightboxSelector.Navigation),
			overlay: root.querySelector(LightboxSelector.Overlay),
			video: root.querySelector(LightboxSelector.Video),
		}

		this.map = map
	}

	rebuild(): void {
		this.build()
		this.reset()
	}

	reset(): void { this.cache = {} }

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		if (this.cache[key])
			return this.cache[key] as LightboxElements[K]

		const element = (this.map[key] ?? null) as LightboxElements[K]
		this.cache[key] = element

		return element
	}
}

class LightboxDOM {
	private readonly cache: LightboxCache

	constructor(
		private root: HTMLDivElement,
		private content: LightboxContentService
	) {
		this.cache = new LightboxCache(this.root)
	}

	async setContent(target: LightboxOptions['target']): Promise<void> {
		const wrapper = this.root.querySelector(LightboxSelector.Content)
		if (!wrapper) return

		const rendered = await this.content.render(target)
		if (rendered) wrapper.replaceChildren(...rendered.children)

		this.rebuildCache()
	}

	updateContent(newContent: HTMLElement | undefined): void {
		const content = this.cache.get('content')
		if (!content || !newContent) return

		const selectors = Object.values(LightboxSelector)

		Array.from(content.children ?? []).forEach(child => {
			const target = selectors.find(cl => child.classList.contains(cl.slice(1))),
				replacement = newContent.querySelector(target ?? '')

			if (replacement) child.replaceWith(replacement)
		})

		this.rebuildCache()
	}

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		return this.cache.get(key)
	}

	rebuildCache(): void { this.cache.rebuild() }

	resetCache(): void { this.cache.reset() }

	toggleDisable(): void { toggleDisableAttr(this.root) }

	append(): void { document.body.appendChild(this.root) }

	remove(): void { this.root.remove() }

	getState(): LightboxStates { return this.root.dataset.state as LightboxStates }

	setState(state: LightboxStates): void {
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
	Media: InstanceType<typeof LightboxAnimation.Media>
	Root: InstanceType<typeof LightboxAnimation.Root>

	constructor(private dom: LightboxDOM) {
		this.Media = new LightboxAnimation.Media(this)
		this.Root = new LightboxAnimation.Root(this)
	}

	async swap() {
		const isMediaAsync = this.dom.getState() === 'change',
			targetBlock = Array.from(this.dom.get('blocks') ?? []).at(-2)

		this.fadeBlocks()
		await Animation.waitForEnd(targetBlock)
		await this.Media.fade?.(isMediaAsync)
	}

	private fadeArrows(isActive: boolean): void {
		const arrows = Array.from(this.dom.get('arrows') ?? [])
		if (!arrows?.length) return

		const values = arrows.map(el => el.dataset.direction),
			directions = isActive ? values : values.reverse()

		directions.forEach((dir, index) => {
			const arrow = arrows.find(({ dataset }) => dataset.direction === dir)
				?.querySelector(LightboxSelector.Icon)

			if (!arrow) return
			Animation.set(arrow, { index, stagger: .25 })
		})
	}

	private fadeBlocks(className: LightboxClass = LightboxClass.Html): void {
		let blocks = Array.from(this.dom.get('blocks') ?? [])
		if (!blocks?.length) return

		const delay = .3,
			stagger = .15,
			state = this.dom.getState()

		const stateDelay = {
			change: delay * 3,
			close: delay,
			open: 0,
		}[state]

		const innerDelay = {
			change: stateDelay,
			close: 0,
			open: delay + stagger,
		}[state]

		if (!!className)
			blocks = blocks.filter(({ classList }) => classList.contains(className))
		const blockList = state === 'open' ? blocks : blocks.slice().reverse()

		blockList.forEach((block, index) => {
			const base = { index, stagger },
				innerBlock = block.querySelector(LightboxBlockSelector.Animation)

			Animation.set(block, { ...base, delay: stateDelay })

			if (innerBlock)
				Animation.Pseudo.set(innerBlock, { ...base, delay: innerDelay })
		})
	}

	static Media = class {
		private dom: LightboxDOM

		constructor(private animator: LightboxAnimation) {
			this.animator = animator
			this.dom = this.animator.dom
		}

		private async fadeParallel({ image, video }: Pick<LightboxElements, 'image' | 'video'>) {
			Animation.set(video)
			Animation.set(image)

			const imageDelay = parseFloat(image!.style.animationDelay),
				videoDelay = parseFloat(video!.style.animationDelay),
				slowerMedia = imageDelay >= videoDelay ? image : video

			await Animation.waitForEnd(slowerMedia)
		}

		private async fadeSequential({ image, video }: Pick<LightboxElements, 'image' | 'video'>) {
			Animation.set(video)
			await Animation.waitForEnd(video)

			Animation.set(image)
			await Animation.waitForEnd(image)
		}

		async fade(isAsync: boolean = false) {
			const image = this.dom.get('image'),
				video = this.dom.get('video')

			if (!image || !video) return
			const elements = { image, video }

			if (isAsync) await this.fadeParallel(elements)
			else await this.fadeSequential(elements)
		}
	}

	static Root = class {
		private dom: LightboxDOM

		constructor(private animator: LightboxAnimation) {
			this.animator = animator
			this.dom = this.animator.dom
		}

		private reflow(
			state: LightboxStates,
			element: HTMLElement | undefined = this.dom.get('root')
		): void {
			if (!element) return
			this.dom.setState(state)

			const { classList } = element,
				cls = LightboxClass.Animation

			if (classList.contains(cls)) classList.remove(cls)
			void element.offsetHeight		// trigger reflow
			classList.add(cls)
		}

		private async fade() {
			Animation.set(this.dom.get('container'))
			Animation.set(this.dom.get('body'))
			Animation.set(this.dom.get('overlay'))
			await Animation.wait('pause')
		}

		async fadeIn() {
			const targetBlock = Array.from(this.dom.get('blocks') ?? []).at(-1)

			this.reflow('open')
			await this.fade()
			await Animation.waitForEnd(this.dom.get('body'))

			this.animator.fadeBlocks()
			await Animation.waitForEnd(targetBlock)

			this.animator.fadeArrows(true)
			await this.animator.Media.fade?.()
		}

		async fadeOut() {
			const targetArrow = Array.from(this.dom.get('arrows') ?? []).at(-1),
				targetBlock = Array.from(this.dom.get('blocks') ?? []).at(-2)

			this.reflow('close')
			await Animation.wait('pause')

			this.animator.fadeArrows(false)
			await Animation.waitForEnd(targetArrow)

			this.animator.fadeBlocks()
			await Animation.waitForEnd(targetBlock)

			await this.animator.Media.fade?.()
			await this.fade()
			await Animation.waitForEnd(this.dom.get('overlay'))
		}
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
		this.unbind()

		const close = this.dom.get('close'),
			overlay = this.dom.get('overlay')

		if (close) this.handleClick(close)
		if (overlay) this.handleClick(overlay)
	}

	unbind(): void {
		this.handlers.forEach(handler => handler())
		this.handlers = []
	}
}

class LightboxMedia {
	private instance?: Hls | Plyr | null
	private media?: HTMLIFrameElement | HTMLVideoElement
	private source: string = ''

	constructor(
		private dom: LightboxDOM,
		private hasVisibleControls: boolean = true
	) {}

	private load(media: HTMLIFrameElement | HTMLVideoElement): void {
		let source = media.src ?? ''

		if (media instanceof HTMLVideoElement) {
			media.setAttribute('controls', `${this.hasVisibleControls}`)

			if (Hls.isSupported()) {
				this.instance = new Hls()
				this.instance.loadSource(source)
				this.instance.attachMedia(media)
				;(window as any).hls = this.instance
			}
			else { new Plyr(media) }
		} else if (media instanceof HTMLIFrameElement) {
			if (this.hasVisibleControls)
				source = `${source}&showinfo=0&controls=0`
		}

		this.media = media
		this.source = source
	}

	configure(): void {
		this.dispose()

		const video = this.dom.get('video')
		if (!video) return

		const native = video.querySelector('video'),
			youtube = video.querySelector('iframe')

		if (native) this.load(native as HTMLVideoElement)
		else if (youtube) this.load(youtube as HTMLIFrameElement)
	}

	dispose(): void {
		if (this.instance) {
			try { this.instance.destroy() }
			catch (err) {}
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
	private elements: LightboxOptions['elements'] = []
	private handlers = new Map<HTMLElement, (evt: Event) => void>()

	constructor(
		private dom: LightboxDOM,
		private content: LightboxContentService,
		private dispatcher: EventDispatcher<LightboxEventMap>
	) {}

	async generate(
		index: number,
		elements?: LightboxOptions['elements']
	) {
		if (!!elements?.length) this.elements = elements
		const directory = await this.create(index)
		this.clear()
		this.construct(directory)

		return directory
	}

	private clear(): void {
		for (const [arrow, handler] of this.handlers)
			arrow.removeEventListener('click', handler)

		this.handlers = new Map()
	}

	private format(index: number): ArrowGroup {
		const max = this.elements.length,
			next = index + 1 < max ? index + 1 : 0,
			prev = index - 1 >= 0 ? index - 1 : max - 1

		return {
			next: { index: next, target: this.elements[next] },
			prev: { index: prev, target: this.elements[prev] },
		} as ArrowGroup
	}

	private async create(index: number): Promise<ArrowGroup> {
		const pointers = this.format(index),
			directions = Object.keys(pointers) as ArrowDirections[]

		const directory = Object.fromEntries(
			await Promise.all(
				directions.map(async dir => {
					let details = {} as Partial<ArrowGroup[typeof dir]>,
						props: ArrowGroup[typeof dir] = pointers[dir]

					if (props.target)
						details = await this.content.retrieve(props.target) ?? {}

					props = Object.assign(props, details)

					return [dir, props] as const
				})
			)
		) as ArrowGroup

		return directory
	}

	private construct(directory: ArrowGroup): void {
		const arrows = this.dom.get('arrows') ?? []
		const directions = Object.keys(directory)
			.reverse() as ArrowDirections[]

		for (const dir of directions) {
			const arrow = [...arrows].find(({ dataset }) => dataset.direction === dir)
			if (!arrow) continue

			const { index, title } = (directory as ArrowGroup)[dir]
			arrow.setAttribute('data-position', `${index}`)

			const arrowText = arrow.querySelector(LightboxSelector.Label)
			if (arrowText && title) {
				const text = wrapContent(title, 'strong')?.innerText
				arrowText.replaceChildren(text ?? '')
			}

			const handler = () => this.dispatcher.emit('navigate', dir)
			arrow.addEventListener('click', handler)
			this.handlers.set(arrow, handler)
		}
	}
}

class LightboxNavigation {
	private isSwapping = false
	private newContent: HTMLElement | undefined = undefined

	constructor(
		private dom: LightboxDOM,
		private animator: LightboxAnimation,
		private events: LightboxEvents,
		private media: LightboxMedia,
		private content: LightboxContentService,
		private dispatcher: EventDispatcher<LightboxEventMap>
	) {}

	private async setupSwap<T extends ArrowDirections>(target: NonNullable<ArrowGroup[T]['target']>) {
		const currentImage = this.dom.get('image')
		this.newContent = await this.content.render(target)

		if (!currentImage || !this.newContent) return
		const newImage = this.newContent.querySelector(LightboxSelector.Image)

		if (newImage) {
			newImage.classList.add(LightboxClass.Temp)
			currentImage.replaceWith(newImage)
			this.dom.rebuildCache()
		}
	}

	private async preSwap() {
		this.media.pause()
		this.dom.toggleDisable()
		this.events.unbind()
		await Animation.wait('swap')

		this.dom.setState('change')
		await this.animator.swap()
	}

	private async performSwap() {
		await Animation.wait('pause')
		this.dom.updateContent(this.newContent)
		this.media.configure()

		this.dom.setState('open')
		await this.animator.swap()
	}

	private async postSwap(index: number) {
		const blocks = this.dom.get('blocks') ?? []

		this.dispatcher.emit('update', index)
		this.media.play()

		await Animation.wait('swap')
		this.events.bind()
		this.dom.toggleDisable()

		for (const block of blocks) {
			if (block.classList.contains(LightboxClass.Temp))
				block.classList.remove(LightboxClass.Temp)
		}
	}

	async swapContent<T extends ArrowDirections>(
		directory: ArrowGroup,
		dir: T
	) {
		const { index, target } = directory[dir]

		if (this.isSwapping || !target) return

		this.isSwapping = true
		await this.setupSwap<T>(target)

		if (!this.newContent) return

		const message = 'LightboxNavigation] swapContent() failed'
		const timeline = [
			() => this.preSwap(),
			() => this.performSwap(),
			() => this.postSwap(index),
		]

		for (const step of timeline)
			await step().catch(error => this.dispatcher.emit('error', { error, message }))

		this.isSwapping = false
	}
}

class LightboxLifecycle {
	private currentIndex: number = 0
	private directory: ArrowGroup = {} as ArrowGroup
	private isActive: boolean = false
	private isReady: Promise<void> | null = null

	constructor(
		private dom: LightboxDOM,
		private animator: LightboxAnimation,
		private events: LightboxEvents,
		private media: LightboxMedia,
		private menu: LightboxMenu,
		private navigator: LightboxNavigation,
		private content: LightboxContentService,
		private dispatcher: EventDispatcher<LightboxEventMap>
	) {}

	private async prefetchFrom(directory: ArrowGroup) {
		const adjacentTargets = [] as (HTMLElement | Node | null | undefined)[],
			directions = Object.keys(directory) as ArrowDirections[]

		directions.forEach(pointer => {
			const { target } = directory[pointer]
			if (!!target) adjacentTargets.push(target)
		})

		if (!adjacentTargets.length) return
		await this.content.prefetcher(adjacentTargets).catch(() => {})
	}

	async initialize(options: LightboxOptions) {
		const { elements, index, target } = options

		this.isReady = (async () => await this.dom.setContent(target))()
		this.media.configure()

		if (!!elements?.length)
			await this.update(index, elements)
	}

	async navigate(dir: ArrowDirections) {
		if (!this.isActive || !Object.keys(this.directory).length) return
		await this.navigator.swapContent<typeof dir>(this.directory, dir)
	}

	async update(
		index: number,
		elements?: LightboxOptions['elements']
	) {
		this.currentIndex = index ?? 0
		const directory = await this.menu.generate(this.currentIndex, elements)

		this.directory = directory
		await this.prefetchFrom(this.directory)
	}

	async open() {
		if (this.isActive) return
		this.isActive = true

		this.dom.toggleDisable()
		await this.isReady
		await this.animator.Root.fadeIn()

		this.media.play()
		this.events.bind()
		this.dom.toggleDisable()
	}

	async close() {
		if (!this.isActive) return
		this.isActive = false

		this.media.pause()
		this.dom.toggleDisable()
		this.events.unbind()

		await this.animator.Root.fadeOut()
		this.destroy()
	}

	destroy(): void {
		this.currentIndex = 0
		this.directory = {} as ArrowGroup
		this.isActive = false
		this.isReady = null

		this.media.dispose()
		this.dom.remove()
		this.dispatcher.clear()
	}
}

export class LightboxController {
	private readonly content: LightboxContentService
	private readonly dispatcher: EventDispatcher<LightboxEventMap>

	private readonly factory: LightboxFactory
	private readonly dom: LightboxDOM
	private readonly media: LightboxMedia
	private readonly menu: LightboxMenu
	private readonly events: LightboxEvents
	private readonly animator: LightboxAnimation
	private readonly navigator: LightboxNavigation
	private readonly lifecycle: LightboxLifecycle
	private static instance: LightboxController | null = null

	constructor(private options: LightboxOptions) {
		if (LightboxController.instance)
			void LightboxController.instance.refresh(options)

		this.content = new LightboxContentService()
		this.dispatcher = new EventDispatcher()
		this.factory = new LightboxFactory(this.options)

		const root = this.factory.createRoot()
		this.dom = new LightboxDOM(root, this.content)
		this.dom.append()

		this.media = new LightboxMedia(this.dom)
		this.menu = new LightboxMenu(this.dom, this.content, this.dispatcher)
		this.events = new LightboxEvents(this.dom, this.dispatcher)

		this.animator = new LightboxAnimation(this.dom)
		this.navigator = new LightboxNavigation(
			this.dom,
			this.animator,
			this.events,
			this.media,
			this.content,
			this.dispatcher
		)

		this.lifecycle = new LightboxLifecycle(
			this.dom,
			this.animator,
			this.events,
			this.media,
			this.menu,
			this.navigator,
			this.content,
			this.dispatcher
		)

		this.registerHandlers()

		void this.lifecycle.initialize(this.options)
		LightboxController.instance = this
	}

	private registerHandlers(): void {
		this.dispatcher.on('open', () => this.lifecycle.open())
		this.dispatcher.on('close', () => this.lifecycle.close())
		this.dispatcher.on('navigate', dir => this.lifecycle.navigate(dir))
		this.dispatcher.on('update', i => this.lifecycle.update(i))
		this.dispatcher.on('error', err => this.handleError(err))
	}

	private handleError({
		error,
		message = 'Something went wrong with the lightbox.'
	}: LightboxEventMap['error']) {
		const container = document.createElement('div'),
			wrapper = document.createElement('span')

		wrapper.textContent = message
		container.classList.add('lightbox__error')
		container.appendChild(wrapper)

		this.dom.get('footer')?.appendChild(container)
		console.error(`[Lightbox Error]: ${message}\n`, error)
	}

	async open() { await this.dispatcher.emit('open') }

	async close() { await this.dispatcher.emit('close') }

	async toggle() { await (this.dom.getState() === 'close' ? this.open() : this.close()) }

	private async refresh(options: LightboxOptions) {
		try {
			this.options = options

			await this.lifecycle.initialize(this.options)
			await this.dispatcher.emit('open')
		}
		catch (error) { this.dispatcher.emit('error', { error }) }
	}

	destroy() {
		this.lifecycle.destroy()
		if (LightboxController.instance === this) LightboxController.instance = null
		console.warn('[LightboxController] already exists in DOM')
	}
}
