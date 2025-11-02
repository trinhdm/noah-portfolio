import Hls from 'hls.js'
import Plyr from 'plyr'

import { toggleDisableAttr, wrapContent } from '../../utils'

import {
	AnimationService as Animation,
	ContentService,
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
		const map: Partial<Record<keyof LightboxElements, any>> = {
			root,
			arrows: root.querySelector(LightboxSelector.Navigation)?.querySelectorAll('[data-direction]'),
			blocks: root.querySelectorAll(LightboxBlockSelector.Block),
			body: root.querySelector(LightboxSelector.Body),
			close: root.querySelector(LightboxSelector.Close),
			container: root.querySelector(LightboxSelector.Container),
			content: root.querySelector(LightboxSelector.Content),
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
		private content: ContentService
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
	constructor(private dom: LightboxDOM) {}

	private reflow(element: HTMLElement | undefined = this.dom.get('root')): void {
		if (!element) return

		const { classList } = element
		const cls = LightboxClass.Animation

		if (classList.contains(cls)) classList.remove(cls)
		void element.offsetHeight		// trigger reflow
		classList.add(cls)
	}

	fadeArrows(isActive: boolean): void {
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

	fadeBlocks(className: `${LightboxClass.Root}__${string}` = LightboxClass.Html): void {
		let blocks = Array.from(this.dom.get('blocks') ?? [])
		if (!blocks?.length) return

		const state = this.dom.getState(),
			isActive = state === 'open'

		const delay = .3,
			stagger = .15

		const stateDelay = {
			change: delay * 3,
			close: delay,
			open: 0,
		}[state]

		if (!!className)
			blocks = blocks.filter(({ classList }) => classList.contains(className))
		const blockList = isActive ? blocks : blocks.slice().reverse()

		blockList.forEach((block, index) => {
			const base = { index, stagger }
			Animation.set(block, { ...base, delay: stateDelay })

			const innerBlock = block.querySelector(LightboxBlockSelector.Animation),
				innerDelay = isActive ? delay + stagger : stateDelay

			if (innerBlock)
				Animation.Pseudo.set(innerBlock, { ...base, delay: innerDelay })
		})
	}

	private async fadeMediaParallel({ image, video }: Pick<LightboxElements, 'image' | 'video'>) {
		Animation.set(video)
		Animation.set(image)

		const imageDelay = parseFloat(image!.style.animationDelay),
			videoDelay = parseFloat(video!.style.animationDelay),
			slowerMedia = imageDelay >= videoDelay ? image : video

		await Animation.waitForEnd(slowerMedia)
	}

	private async fadeMediaSequential({ image, video }: Pick<LightboxElements, 'image' | 'video'>) {
		Animation.set(video)
		await Animation.waitForEnd(video)

		Animation.set(image)
		await Animation.waitForEnd(image)
	}

	async fadeMedia(isAsync: boolean = false) {
		const image = this.dom.get('image'),
			video = this.dom.get('video')

		if (!image || !video) return
		const elements = { image, video }

		if (isAsync) await this.fadeMediaParallel(elements)
		else await this.fadeMediaSequential(elements)
	}

	async fadeRootIn() {
		this.dom.setState('open')
		this.reflow()

		await Animation.waitForEnd(this.dom.get('body'))
		this.fadeBlocks()

		try {
			const targetBlock = Array.from(this.dom.get('blocks') ?? []).at(-1)
			await Animation.waitForEnd(targetBlock)
			this.fadeArrows(true)
		}
		catch (err) { console.warn('[LightboxAnimation] fadeRootIn() failed', err) }
		finally { await this.fadeMedia?.() }
	}

	async fadeRootOut() {
		this.dom.setState('close')
		this.reflow()

		await Animation.wait('pause')
		this.fadeArrows(false)

		try {
			const targetArrow = Array.from(this.dom.get('arrows') ?? []).at(-1)
			await Animation.waitForEnd(targetArrow)
			this.fadeBlocks()

			const targetBlock = Array.from(this.dom.get('blocks') ?? []).at(-2)
			await Animation.waitForEnd(targetBlock)
			await this.fadeMedia?.()

			Animation.set(this.dom.get('container'))
			Animation.set(this.dom.get('body'))
		}
		catch (err) { console.warn('[LightboxAnimation] fadeRootOut() failed', err) }
		finally { Animation.set(this.dom.get('overlay')) }
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
			} else {
				new Plyr(media)
			}
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
		private content: ContentService,
		private dispatcher: EventDispatcher<LightboxEventMap>
	) {}

	async store(elements: LightboxOptions['elements']) { this.elements = elements }

	async generate(index: number) {
		const directory = await this.create(index)
		this.clear()
		this.construct(directory)

		return directory
	}

	clear(): void {
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
		private content: ContentService,
		private dispatcher: EventDispatcher<LightboxEventMap>
	) {}

	private async setupSwap(target: NonNullable<ArrowGroup['next']['target']>) {
		const currentImage = this.dom.get('image')
		if (!currentImage) return

		try {
			this.newContent = await this.content.render(target)
			const newImage = this.newContent?.querySelector(LightboxSelector.Image)

			if (newImage) {
				newImage.classList.add(LightboxClass.Temp)
				currentImage.replaceWith(newImage)
			}

			await Animation.wait()
		}
		catch (err) { console.warn('[LightboxNavigation] setupSwap() failed:', err) }
		finally { this.dom.rebuildCache() }
	}

	private async animateSwap() {
		const isMediaAsync = this.dom.getState() === 'change',
			index = isMediaAsync ? -1 : -2

		this.animator.fadeBlocks()

		try {
			const targetBlock = Array.from(this.dom.get('blocks') ?? []).at(-2)
			await Animation.waitForEnd(targetBlock)
		}
		catch (err) { console.warn('[LightboxNavigation] animateSwap() failed:', err) }
		finally { await this.animator.fadeMedia?.(isMediaAsync) }
	}

	private async preSwap() {
		try {
			this.media.pause()
			this.dom.toggleDisable()
			this.events.unbind()
			await Animation.wait('swap')
			this.dom.setState('change')
		}
		catch (err) { console.warn('[LightboxNavigation] preSwap() failed:', err) }
		finally { await this.animateSwap() }
	}

	private async performSwap() {
		if (!this.newContent) return

		try {
			await Animation.wait('pause')
			this.dom.updateContent(this.newContent)
			this.media.configure()
			this.dom.setState('open')
		}
		catch (err) { console.warn('[LightboxNavigation] performSwap() failed:', err) }
		finally { await this.animateSwap() }
	}

	private async postSwap(index: number) {
		try {
			this.dispatcher.emit('update', index)
			this.media.play()
			this.events.bind()

			await Animation.wait('swap')
			const blocks = this.dom.get('blocks') ?? []

			for (const block of blocks) {
				if (block.classList.contains(LightboxClass.Temp)) {
					block.style.animation = 'none'
					block.classList.remove(LightboxClass.Temp)
				}
			}
		}
		catch (err) { console.warn('[LightboxNavigation] postSwap() failed:', err) }
		finally { this.dom.toggleDisable() }
	}

	async swapContent<T extends ArrowDirections>(
		directory: ArrowGroup,
		dir: T
	) {
		const { index, target } = directory[dir]

		if (this.isSwapping || !target) return
		this.isSwapping = true

		const timeline = [
			() => this.setupSwap(target),
			() => this.preSwap(),
			() => this.performSwap(),
			() => this.postSwap(index),
		]

		for (const step of timeline)
			await step().catch(err => console.warn('[LightboxNavigation] swapContent() failed:', err))

		this.isSwapping = false
	}
}

class LightboxLifecycle {
	private currentIndex: number = 0
	private directory: ArrowGroup = {} as ArrowGroup
	private isActive: boolean = false

	constructor(
		private dom: LightboxDOM,
		private animator: LightboxAnimation,
		private events: LightboxEvents,
		private media: LightboxMedia,
		private menu: LightboxMenu,
		private navigator: LightboxNavigation,
		private content: ContentService,
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

	async initialize({ elements, index, target }: LightboxOptions) {
		try {
			await this.dom.setContent(target)
			this.media.configure()

			if (!!elements?.length) {
				this.menu.store(elements)
				await this.dispatcher.emit('update', index)
			}
		} catch (err) { console.error('[LightboxLifecycle] initialize() failed:', err) }
	}

	async navigate(dir: ArrowDirections) {
		if (!this.isActive || !Object.keys(this.directory).length) return
		await this.navigator.swapContent<typeof dir>(this.directory, dir)
	}

	async update(index: number) {
		this.currentIndex = index ?? 0
		const directory = await this.menu.generate(this.currentIndex)

		this.directory = directory
		await this.prefetchFrom(this.directory)
	}

	async open() {
		if (this.isActive) return
		this.isActive = true

		try {
			this.dom.toggleDisable()
			await this.animator.fadeRootIn()

			this.media.play()
			this.events.bind()
		}
		catch (err) { console.warn('[LightboxLifecycle] open() failed:', err) }
		finally { this.dom.toggleDisable() }
	}

	async close() {
		if (!this.isActive) return
		this.isActive = false

		try {
			this.media.pause()
			this.dom.toggleDisable()
			this.events.unbind()

			await this.animator.fadeRootOut()
			await Animation.waitForEnd(this.dom.get('overlay'))
		}
		catch (err) { console.warn('[LightboxLifecycle] close() failed:', err) }
		finally { this.destroy() }
	}

	destroy(): void {
		this.isActive = false
		this.menu.clear()
		this.media.dispose()
		this.dom.remove()
		this.dispatcher.clear()
	}
}

export class LightboxController {
	private readonly content: ContentService
	private readonly dispatcher: EventDispatcher<LightboxEventMap>

	private readonly factory: LightboxFactory
	private readonly dom: LightboxDOM
	private readonly menu: LightboxMenu
	private readonly animator: LightboxAnimation
	private readonly events: LightboxEvents
	private readonly media: LightboxMedia
	private readonly navigator: LightboxNavigation
	private readonly lifecycle: LightboxLifecycle

	readonly ready: Promise<void>

	constructor(private options: LightboxOptions) {
		this.content = new ContentService()
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

		this.registerDefaultHandlers()

		let resolveReady!: () => void
	    this.ready = new Promise<void>(resolve => (resolveReady = resolve))
		void this.dispatcher.emit('ready', resolveReady)
	}

	private registerDefaultHandlers(): void {
		this.dispatcher.on('ready', (resolve: () => void) => {
			this.lifecycle.initialize(this.options).finally(resolve)
		})
		this.dispatcher.on('open', () => this.lifecycle.open())
		this.dispatcher.on('close', () => this.lifecycle.close())
		this.dispatcher.on('navigate', dir => this.lifecycle.navigate(dir))
		this.dispatcher.on('update', i => this.lifecycle.update(i))
	}

	async open() {
		await this.ready
		await this.dispatcher.emit('open')
	}

	async close() {
		await this.ready
		await this.dispatcher.emit('close')
	}

	async toggle() { await (this.dom.getState() === 'close' ? this.open() : this.close()) }
}
