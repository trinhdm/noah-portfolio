import Hls from 'hls.js'
import Plyr from 'plyr'

import { toggleDisableAttr, wrapContent } from '../../utils'
import { AnimationService as Animation, EventDispatcher } from '../../services'
import { LightboxContentService } from './LightboxContentService.ts'

import {
	LightboxBlockSelector,
	LightboxClass,
	LightboxSelector,
} from './constants.ts'

import type {
	ArrowDirections,
	ArrowGroup,
	LightboxDispatcher,
	LightboxElements,
	LightboxEventMap,
	LightboxOptions,
	LightboxStates,
} from './lightbox.types'

import type { Entries } from '../../types'
import type { HandlerFor,  HTMLTarget } from '../../services'

import template from './template.ts'


class LightboxFactory {
	private readonly ignored: string[] = ['innerHTML', 'innerText', 'outerHTML', 'textContent']

	constructor() {}

	createRoot({ properties }: LightboxOptions): HTMLDivElement {
		const root = document.createElement('div')

		root.classList.add(LightboxClass.Root)
		root.innerHTML = template

		if (!!properties) {
			const props = Object.entries(properties)

			if (props.length) {
				for (const [prop, value] of props)
					if (!this.ignored.includes(prop)) root.setAttribute(prop, String(value))
			}
		}

		return root
	}
}

class LightboxCache {
	private cache = new Map<keyof LightboxElements, any>()
	private map: Partial<LightboxElements> = {}

	constructor(private root: HTMLElement) {
		this.build()
	}

	private build(): void {
		const root = this.root
		let map = {
			root,
			blocks: Array.from(root.querySelectorAll(LightboxBlockSelector.Root) ?? []),
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
		} as Partial<LightboxElements>

		map = {
			...map,
			arrows: Array.from(map.navigation?.querySelectorAll('[data-direction]') ?? []),
			player: map.video?.querySelector('video') || map.video?.querySelector('iframe'),
		} as Partial<LightboxElements>

		this.map = map
		this.reset()
	}

	rebuild(): void {
		this.build()
		this.reset()
	}

	reset(): void { this.cache.clear() }

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		if (this.cache.has(key))
			return this.cache.get(key) as LightboxElements[K]

		const value = (this.map[key] ?? null) as LightboxElements[K]
		this.cache.set(key, value)

		return value
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
		const wrapper = this.cache.get('content')
		if (!wrapper) return

		const rendered = await this.content.render(target)
		if (rendered) wrapper.replaceChildren(...rendered.children)
			console.log({ rendered }, rendered?.children)

		this.rebuildCache()
	}

	updateContent(content: HTMLTarget): void {
		const wrapper = this.cache.get('content')
		if (!wrapper || !content) return

		const selectors = Object.values(LightboxSelector)

		Array.from(wrapper.children).forEach(child => {
			const target = selectors.find(cl => child.classList.contains(cl.slice(1))),
				replacement = content.querySelector(target ?? '')

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

	setState(state: LightboxStates): void { this.root.dataset.state = state }
}

class LightboxAnimator {
	Media: InstanceType<typeof LightboxAnimator.Media>
	Root: InstanceType<typeof LightboxAnimator.Root>

	constructor(private dom: LightboxDOM) {
		this.Media = new LightboxAnimator.Media(this)
		this.Root = new LightboxAnimator.Root(this)
	}

	async swap() {
		const isMediaAsync = this.dom.getState() === 'change',
			targetBlock = this.dom.get('blocks').at(-2)

		this.fadeBlocks()
		await Animation.waitForEnd(targetBlock)
		await this.Media.fade?.(isMediaAsync)
	}

	private fadeArrows(isActive: boolean): void {
		const arrows = this.dom.get('arrows')
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
		let blocks = this.dom.get('blocks')
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

		constructor(private animator: LightboxAnimator) {
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

		constructor(private animator: LightboxAnimator) {
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
			const targetBlock = this.dom.get('blocks').at(-1)

			this.reflow('open')
			await this.fade()
			await Animation.waitForEnd(this.dom.get('body'))

			this.animator.fadeBlocks()
			await Animation.waitForEnd(targetBlock)

			this.animator.fadeArrows(true)
			await this.animator.Media.fade?.()
		}

		async fadeOut() {
			const targetArrow = this.dom.get('arrows').at(-1),
				targetBlock = this.dom.get('blocks').at(-2)

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
		private dispatch: LightboxDispatcher
	) {}

	private handleClick(
		target: HTMLElement,
		handler: () => void = (() => this.dispatch.emit('close'))
	) {
		target.addEventListener('click', handler)
		this.handlers.push(() => target.removeEventListener('click', handler))
	}

	private bindClicks() {
		const arrows = this.dom.get('arrows'),
			close = this.dom.get('close'),
			overlay = this.dom.get('overlay')

		if (close) this.handleClick(close)
		if (overlay) this.handleClick(overlay)

		if (arrows.length) {
			arrows.forEach(arrow => {
				const dir = arrow.dataset.direction as ArrowDirections
				this.handleClick(arrow, () => this.dispatch.emit('navigate', dir))
			})
		}
	}

	private bindKeyDown() {
		const handler = ({ key }: KeyboardEvent) => ({
			ArrowLeft: void this.dispatch.emit('navigate', 'prev'),
			ArrowRight: void this.dispatch.emit('navigate', 'next'),
			Escape: void this.dispatch.emit('close'),
		}[key])

		window.addEventListener('keydown', handler)
		this.handlers.push(() => window.removeEventListener('keydown', handler))
	}

	bind(): void {
		this.unbind()

		this.bindClicks()
		this.bindKeyDown()
	}

	unbind(): void {
		this.handlers.forEach(removeHandler => removeHandler())
		this.handlers = []
	}
}

class LightboxMedia {
	private instance?: Hls | Plyr | null
	private media?: HTMLIFrameElement | HTMLVideoElement
	private source: string = ''

	constructor(
		private dom: LightboxDOM,
		private dispatch: LightboxDispatcher,
		private hasControls: boolean = true
	) {}

	private loadNative(element: HTMLVideoElement) {
		let src = element.src || '',
			message = '[LightboxMedia] loadNative() failed on:'

		element.setAttribute('controls', `${this.hasControls}`)

		if (Hls.isSupported()) {
			message = `${message} HLS`

			try {
				this.instance = new Hls()
				this.instance.loadSource(src)
				this.instance.attachMedia(element)
			}
			catch (error) { this.dispatch.emit('error', { error, message }) }
		} else {
			message = `${message} Plyr`

			try { this.instance = new Plyr(element) }
			catch (error) { this.dispatch.emit('error', { error, message }) }
		}
	}

	private loadYoutube(element: HTMLIFrameElement) {
		let src = element.src || ''

		if (this.hasControls) {
			const separator = src.includes('?') ? '&' : '?'
			src = `${src}${separator}showinfo=0&controls=0`
		}

		element.src = src
	}

	load() {
		this.dispose()

		const player = this.dom.get('player')
		if (!player) return

		if (player instanceof HTMLVideoElement)
			this.loadNative(player)
		else if (player instanceof HTMLIFrameElement)
			this.loadYoutube(player)

		this.media = player
		this.source = player.src
	}

	dispose(): void {
		if (this.instance) {
			try { this.instance.destroy() }
			catch (err) {}
			this.instance = null
		}

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

	constructor(
		private dom: LightboxDOM,
		private content: LightboxContentService
	) {}

	async configure(
		index: number,
		elements?: LightboxOptions['elements']
	) {
		if (!!elements?.length) this.elements = elements

		const directory = await this.getDirectory(index)
		this.setArrows(directory)

		return directory
	}

	private findAdjacent(index: number): ArrowGroup {
		const max = this.elements.length,
			next = index + 1 < max ? index + 1 : 0,
			prev = index - 1 >= 0 ? index - 1 : max - 1

		return {
			next: { index: next, target: this.elements[next] },
			prev: { index: prev, target: this.elements[prev] },
		} as ArrowGroup
	}

	private async getDirectory(index: number): Promise<ArrowGroup> {
		const adjacents = this.findAdjacent(index),
			directory = {} as ArrowGroup,
			dirs = Object.keys(adjacents) as ArrowDirections[]

		await Promise.all(
			dirs.map(async dir => {
				const adj = adjacents[dir],
					details = adj.target ? await this.content.load(adj.target) : {}
				directory[dir] = Object.assign({}, adj, details)
			})
		)

		return directory
	}

	private setArrows(directory: ArrowGroup): void {
		const arrows = this.dom.get('arrows'),
			dirs = Object.keys(directory).reverse() as ArrowDirections[]

		for (const dir of dirs) {
			const arrow = arrows.find(({ dataset }) => dataset.direction === dir),
				{ index, title } = (directory as ArrowGroup)[dir]

			if (!arrow || !title) continue

			const label = arrow.querySelector(LightboxSelector.Label),
				text = wrapContent(title, 'strong')?.innerText ?? ''

			if (label) label.replaceChildren(text)
			arrow.setAttribute('data-position', `${index}`)
		}
	}
}

class LightboxNavigator {
	private isSwapping = false
	private pendingContent: HTMLTarget = undefined

	constructor(
		private dom: LightboxDOM,
		private animator: LightboxAnimator,
		private events: LightboxEvents,
		private media: LightboxMedia,
		private content: LightboxContentService,
		private dispatch: LightboxDispatcher
	) {}

	private async setupSwap<T extends ArrowDirections>(target: NonNullable<ArrowGroup[T]['target']>) {
		this.pendingContent = await this.content.render(target)
		if (!this.pendingContent) return

		const currentImage = this.dom.get('image'),
			newImage = this.pendingContent.querySelector(LightboxSelector.Image)

		if (currentImage && newImage) {
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
		this.dom.updateContent(this.pendingContent)
		this.media.load()

		this.dom.setState('open')
		await this.animator.swap()
	}

	private async postSwap(index: number) {
		const blocks = this.dom.get('blocks')

		this.dispatch.emit('update', index)
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

		if (!this.pendingContent) return

		const message = 'LightboxNavigator] swapContent() failed'
		const timeline = [
			() => this.preSwap(),
			() => this.performSwap(),
			() => this.postSwap(index),
		]

		for (const step of timeline)
			await step().catch(error => this.dispatch.emit('error', { error, message }))

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
		private animator: LightboxAnimator,
		private events: LightboxEvents,
		private media: LightboxMedia,
		private menu: LightboxMenu,
		private navigator: LightboxNavigator,
		private content: LightboxContentService,
		private dispatch: LightboxDispatcher
	) {}

	handleError({
		error,
		message = 'Something went wrong with the lightbox.'
	}: LightboxEventMap['error']): void {
		const container = document.createElement('div'),
			wrapper = document.createElement('span')

		wrapper.textContent = message
		container.classList.add('lightbox__error')
		container.appendChild(wrapper)

		this.dom.get('footer')?.appendChild(container)
		console.error(`[Lightbox Error]: ${message}\n`, error)
	}

	private async prefetch(directory: ArrowGroup) {
		if (!this.isActive || !Object.keys(this.directory).length) return

		const adjacentTargets = [] as (HTMLElement | null)[],
			directions = Object.keys(directory) as ArrowDirections[]

		directions.forEach(dir => {
			const { target } = directory[dir]
			if (!!target) adjacentTargets.push(target)
		})

		if (!adjacentTargets.length) return
		await this.content.prefetcher(adjacentTargets).catch(error => (
			this.dispatch.emit('error', { error, message: '[Lifecycle] prefetch failed' })
		))
	}

	private async initialize({ elements, index, target }: LightboxOptions) {
		if (this.isActive) return

		this.isReady = (async () => {
			await this.dom.setContent(target)
			this.media.load()
		})()

		if (!!elements?.length) await this.handleUpdate(index, elements)
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

	async handleNavigate(dir: ArrowDirections) {
		if (!this.isActive || !Object.keys(this.directory).length) return
		await this.navigator.swapContent<typeof dir>(this.directory, dir)
	}

	async handleUpdate(
		index: number,
		elements?: LightboxOptions['elements']
	) {
		this.currentIndex = index ?? 0
		await Animation.wait()

		const directory = await this.menu.configure(this.currentIndex, elements)
		this.directory = directory

		await Animation.wait()
		await this.prefetch(this.directory)
	}

	async handleMount(options: LightboxOptions) {
		this.dom.append()
		this.registerHandlers()
		await this.initialize(options)
	}

	async handleOpen() {
		if (this.isActive) return
		this.isActive = true
		document.body.style.overflow = 'hidden'

		this.dom.toggleDisable()
		await this.isReady
		await this.animator.Root.fadeIn()

		this.media.play()
		this.events.bind()
		this.dom.toggleDisable()
	}

	async handleClose() {
		if (!this.isActive) return
		this.isActive = false

		this.dom.toggleDisable()
		this.media.pause()
		this.events.unbind()

		await this.animator.Root.fadeOut()
		document.body.style.overflow = 'auto'
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

class LightboxController {
	private readonly content: LightboxContentService
	private readonly dispatch: LightboxDispatcher

	private readonly root: HTMLDivElement
	private readonly dom: LightboxDOM
	private readonly media: LightboxMedia
	private readonly menu: LightboxMenu
	private readonly events: LightboxEvents
	private readonly animator: LightboxAnimator
	private readonly navigator: LightboxNavigator
	private readonly lifecycle: LightboxLifecycle

	constructor(private options: LightboxOptions) {
		this.content = new LightboxContentService()
		this.dispatch = new EventDispatcher()
		this.root = new LightboxFactory().createRoot(this.options)

		this.dom = new LightboxDOM(this.root, this.content)
		this.media = new LightboxMedia(this.dom, this.dispatch)
		this.menu = new LightboxMenu(this.dom, this.content)
		this.events = new LightboxEvents(this.dom, this.dispatch)

		this.animator = new LightboxAnimator(this.dom)
		this.navigator = new LightboxNavigator(
			this.dom,
			this.animator,
			this.events,
			this.media,
			this.content,
			this.dispatch
		)

		this.lifecycle = new LightboxLifecycle(
			this.dom,
			this.animator,
			this.events,
			this.media,
			this.menu,
			this.navigator,
			this.content,
			this.dispatch
		)
	}

	async mount() { await this.lifecycle.handleMount(this.options) }

	async open() { await this.dispatch.emit('open') }

	async close() { await this.dispatch.emit('close') }

	destroy(): void { this.lifecycle.handleDestroy() }
}

export class LightboxManager {
	private instance: LightboxController | null = null

	constructor(private options: LightboxOptions) {
		this.instance = null
	}

	async open() {
		if (this.instance) await this.instance?.close()

		const controller = new LightboxController(this.options)
		this.instance = controller

		await controller.mount()
		await controller.open()
	}

	async close() {
		if (!this.instance) return
		await this.instance?.close()
		this.instance = null
	}
}
