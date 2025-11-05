import Hls from 'hls.js'
import Plyr from 'plyr'

import { toggleDisableAttr } from '../../utils'
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
	LightboxElement,
	LightboxElements,
	LightboxEventMap,
	LightboxOptions,
	LightboxStates,
	LightboxVideoOptions,
} from './lightbox.types'

import type { Entries, FilterObjArrs } from '../../types'
import type { AnimationOptions, HandlerFor } from '../../services'

import template from './template.ts'


class LightboxFactory {
	private readonly ignored: string[] = ['innerHTML', 'innerText', 'outerHTML', 'textContent']

	constructor() {}

	createRoot({ properties }: LightboxOptions): HTMLDialogElement {
		const root = document.createElement('dialog')

		root.classList.add(LightboxClass.Root)
		root.innerHTML = template

		if (properties) {
			const props = Object.entries(properties)

			for (const [prop, val] of props)
				if (!this.ignored.includes(prop)) root.setAttribute(prop, String(val))
		}

		return root
	}
}

class LightboxCache {
	private cache = new Map<keyof LightboxElements, LightboxElement>()
	private map: Partial<LightboxElements> = {}

	constructor(private root: HTMLDialogElement) {
		this.build()
	}

	private build(): void {
		const root = this.root

		const base: Partial<LightboxElements> = {
			root,
			blocks: Array.from(root.querySelectorAll(LightboxBlockSelector.Root) ?? []),
			body: root.querySelector(LightboxSelector.Body),
			container: root.querySelector(LightboxSelector.Container),
			content: root.querySelector(LightboxSelector.Content),
			footer: root.querySelector(LightboxSelector.Footer),
			icons: Array.from(root.querySelectorAll(LightboxSelector.Icon) ?? []),
			image: root.querySelector(LightboxSelector.Image),
			navigation: root.querySelector(LightboxSelector.Navigation),
			overlay: root.querySelector(LightboxSelector.Overlay),
			video: root.querySelector(LightboxSelector.Video),
		} as Partial<LightboxElements>

		const extended = {
			arrows: Array.from(base.navigation?.querySelectorAll('[data-direction]') ?? []),
			exit: base.icons?.find(ic => ic.dataset.icon === 'close'),
			player: base.video?.querySelector('video') || base.video?.querySelector('iframe'),
		} as Partial<LightboxElements>

		this.map = { ...base, ...extended } as LightboxElements
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
		private root: HTMLDialogElement,
		private content: LightboxContentService,
		private dispatch: LightboxDispatcher
	) {
		this.cache = new LightboxCache(this.root)
	}

	async setContent(target: LightboxOptions['target']): Promise<void> {
		const wrapper = this.cache.get('content')
		if (!wrapper) return

		try {
			const rendered = await this.content.render(target)
			if (rendered) wrapper.replaceChildren(...rendered.children)
		}
		catch (error) { this.dispatch.emit('error', { error, message: 'LightboxDOM.setContent() failed' }) }
		finally { this.rebuildCache() }
	}

	updateContent(content: HTMLElement | undefined): void {
		const wrapper = this.cache.get('content')
		if (!wrapper || !content) return

		const selectors = Object.values(LightboxSelector)

		for (const child of wrapper.children) {
			const target = selectors.find(cl => child.classList.contains(cl.slice(1))),
				replacement = content.querySelector(target ?? '')
			console.log(selectors.find(cl => {
				child.classList.contains(cl.slice(1))
				console.log(cl, cl.slice(1))
			}))

			if (replacement) child.replaceWith(replacement)
		}

		this.rebuildCache()
	}

	toggleDisable(): void {
		toggleDisableAttr(this.root)

		const icons = this.cache.get('icons')
		icons.forEach(icon => icon.disabled = this.root.dataset.disabled === 'true')
	}

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		return this.cache.get(key)
	}

	rebuildCache(): void { this.cache.rebuild() }

	resetCache(): void { this.cache.reset() }

	append(): void { document.body.appendChild(this.root) }

	remove(): void { this.root.remove() }

	getState(): LightboxStates { return this.root.dataset.state as LightboxStates }

	setState(state: LightboxStates): void { this.root.dataset.state = state }
}

class LightboxAnimator {
	private queue = new Set<Exclude<LightboxElement, any[]>>()

	Media: InstanceType<typeof LightboxAnimator.Media>
	Root: InstanceType<typeof LightboxAnimator.Root>

	constructor(private dom: LightboxDOM) {
		this.Media = new LightboxAnimator.Media(this)
		this.Root = new LightboxAnimator.Root(this)
	}

	private animate(
		key: keyof FilterObjArrs<LightboxElements> | Element | null | undefined,
		options: AnimationOptions = {},
		isPseudo: boolean = false
	): void {
		const target = typeof key === 'string'
			? this.dom.get(key)
			: key as HTMLElement | undefined

		if (!target) return
		this.queue.add(target)

		if (isPseudo) Animation.Pseudo.set(target, options)
		else Animation.set(target, options)
	}

	async waitForEnd(target: HTMLElement | undefined) {
		if (!target) return
		this.queue.delete(target)
		await Animation.waitForEnd(target)
	}

	async waitForFinish() {
		await new Promise(requestAnimationFrame)

		const animations = Array.from(this.queue),
			root = this.dom.get('root')

		if (!animations.length) return
		await Promise.allSettled(
			animations.map(el => el ? Animation.waitForEnd(el) : Promise.resolve())
		)

		if (root.hasAttribute('data-animated'))
			root.removeAttribute('data-animated')

		this.queue.clear()
	}

	async swap(direction: 'in' | 'out') {
		this.dom.get('root').setAttribute('data-animated', direction)

		const isMediaAsync = direction === 'out',
			targetBlock = this.dom.get('blocks').at(-2)

		this.fadeBlocks()
		await this.waitForEnd(targetBlock)

		await this.Media.fadeAll?.(isMediaAsync)
		await this.waitForFinish()
	}

	private fadeArrows(isActive: boolean): void {
		const arrows = this.dom.get('arrows')
		if (!arrows?.length) return

		const arrowList = isActive ? arrows : arrows.reverse()

		arrowList.forEach((arrow, index) => {
			const icon = arrow.querySelector(LightboxSelector.Icon)
			this.animate(icon, { index, stagger: .25 })
		})
	}

	private fadeBlocks(className: LightboxClass = LightboxClass.Html): void {
		let blocks = this.dom.get('blocks')
		if (!blocks?.length) return

		const delay = .3,
			stagger = .15

		const state = this.dom.getState(),
			isSwapIn = state === 'change' && this.dom.get('root').dataset.animated === 'in'

		const stateDelay = {
			change: isSwapIn ? delay : delay * 2,
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
		const blockList = state === 'open' || isSwapIn ? blocks : blocks.slice().reverse()

		blockList.forEach((block, index) => {
			const base = { index, stagger }
			this.animate(block, { ...base, delay: stateDelay })

			const innerBlock = block.querySelector(LightboxBlockSelector.Animation)
			if (!innerBlock) return
			this.animate(innerBlock, { ...base, delay: innerDelay }, true)
		})
	}

	static Media = class {
		private dom: LightboxDOM

		constructor(private animator: LightboxAnimator) {
			this.animator = animator
			this.dom = this.animator.dom
		}

		private async fadeParallel({ image, video }: Pick<LightboxElements, 'image' | 'video'>) {
			this.animator.animate(video)
			this.animator.animate(image)

			const imageDelay = parseFloat(image!.style.animationDelay),
				videoDelay = parseFloat(video!.style.animationDelay),
				slowerMedia = imageDelay >= videoDelay ? image : video

			await this.animator.waitForEnd(slowerMedia)
		}

		private async fadeSequential({ image, video }: Pick<LightboxElements, 'image' | 'video'>) {
			this.animator.animate(video)
			await this.animator.waitForEnd(video)

			this.animator.animate(image)
			await this.animator.waitForEnd(image)
		}

		async fadeAll(isAsync: boolean = false) {
			const image = this.dom.get('image'),
				video = this.dom.get('video')

			if (!image || !video) return
			const media = { image, video }

			if (isAsync) await this.fadeParallel(media)
			else await this.fadeSequential(media)
		}
	}

	static Root = class {
		private dom: LightboxDOM

		constructor(private animator: LightboxAnimator) {
			this.animator = animator
			this.dom = this.animator.dom
		}

		private startFade(
			state: LightboxStates
		): void {
			this.dom.setState(state)
			this.dom.get('root').setAttribute('data-animated', '')
		}

		private fadeMain() {
			this.animator.animate('container')
			this.animator.animate('body')
			this.animator.animate('overlay')
		}

		async fadeIn() {
			const targetBlock = this.dom.get('blocks').at(-1)

			this.startFade('open')

			this.fadeMain()
			await this.animator.waitForEnd(this.dom.get('container'))
			// await Animation.wait('pause')

			this.animator.fadeBlocks()
			await this.animator.waitForEnd(targetBlock)

			this.animator.fadeArrows(true)
			await this.animator.Media.fadeAll?.()
			this.animator.animate('exit')

			await this.animator.waitForFinish()
		}

		async fadeOut() {
			const targetArrow = this.dom.get('arrows').at(-1),
				targetBlock = this.dom.get('blocks').at(-1)

			this.startFade('close')

			this.animator.animate('exit')
			await Animation.wait('pause')

			this.animator.fadeArrows(false)
			await this.animator.waitForEnd(targetArrow)

			this.animator.fadeBlocks()
			await this.animator.waitForEnd(targetBlock)

			this.fadeMain()
			await this.animator.Media.fadeAll?.()

			await this.animator.waitForFinish()
		}
	}
}

class LightboxEvents {
	private handlers: Array<() => void> = []
	private focusableElements: HTMLElement[] = []
	private outsideFocus: HTMLElement | null = null

	private keyHandlers = {
		ArrowDown: () => this.dispatch.emit('navigate', 'next'),
		ArrowLeft: () => this.dispatch.emit('navigate', 'prev'),
		ArrowRight: () => this.dispatch.emit('navigate', 'next'),
		ArrowUp: () => this.dispatch.emit('navigate', 'prev'),
		Escape: () => this.dispatch.emit('close'),
	} as const

	constructor(
		private dom: LightboxDOM,
		private dispatch: LightboxDispatcher
	) {}

	private handleClick(
		target: HTMLElement,
		callback: () => void = () => this.dispatch.emit('close')
	) {
		const handler = (event: MouseEvent) => { event.preventDefault(); callback?.() }
		target.addEventListener('click', handler)
		this.handlers.push(() => target.removeEventListener('click', handler))
	}

	private bindClicks() {
		const arrows = this.dom.get('arrows'),
			exit = this.dom.get('exit'),
			overlay = this.dom.get('overlay')

		if (exit) this.handleClick(exit)
		if (overlay) this.handleClick(overlay)

		if (arrows.length) {
			for (const arrow of arrows) {
				const { direction } = arrow.dataset as { direction: ArrowDirections }
				this.handleClick(arrow, () => this.dispatch.emit('navigate', direction))
			}
		}
	}

	private bindKeyDown() {
		type KeyHandles = keyof typeof this.keyHandlers

		const handleKey = (event: KeyboardEvent) => {
			let { key, target } = event as {
				key: KeyHandles | 'Tab'
				target: HTMLElement | null
			}

			if (event.key === 'Tab') {
				// if (!target) return
				// 	console.log(
				// 		{ target },
				// 		this.focusableElements,
				// 		this.focusableElements.find(el => el === document.activeElement)
				// 	)

				// if (this.focusableElements.some(el => el === document.activeElement)) target.focus()
				// event.preventDefault()
			} else {
				key = key as keyof typeof this.keyHandlers
				// if (Object.hasOwn(this.keyHandlers, key))
				return this.keyHandlers[key]?.()
			}
		}

		window.addEventListener('keydown', handleKey)
		this.handlers.push(() => window.removeEventListener('keydown', handleKey))
	}

	private bindFocus() {
		const { activeElement } = document as { activeElement: HTMLElement | null }

		this.outsideFocus = activeElement
		activeElement?.blur()

		const root = this.dom.get('root'),
			selectors = 'a, button, iframe, input, select, textarea, video',
			interactive = Array.from(root?.querySelectorAll(selectors) ?? [])
				.filter(el => !el.hasAttribute('disabled')) as HTMLElement[]

		if (!interactive.length) return

		this.focusableElements = interactive
		const focusTarget = interactive.find(el => el.checkVisibility())

		;(focusTarget ?? root).focus()
		console.log({ outside: this.outsideFocus, focusTarget })
	}

	bind(): void {
		this.unbind()

		// this.bindFocus()
		this.bindClicks()
		this.bindKeyDown()
	}

	unbind(): void {
		this.handlers.forEach(removeHandler => removeHandler())
		this.handlers = []
		// if (this.outsideFocus) this.outsideFocus.focus()
	}
}

class LightboxMedia {
	private instance?: Hls | Plyr | null
	private media?: HTMLIFrameElement | HTMLVideoElement
	private source: string = ''

	private options: Required<LightboxVideoOptions> = {
		controls: false,
		loop: true,
		mute: false,
	}

	constructor(
		private dom: LightboxDOM,
		private dispatch: LightboxDispatcher
	) {}

	private loadNative(element: HTMLVideoElement) {
		const src = element.src || ''
		element.setAttribute('controls', `${this.options.controls}`)

		if (Hls.isSupported()) {
			try {
				this.instance = new Hls()
				this.instance.loadSource(src)
				this.instance.attachMedia(element)
			} catch (error) {
				const message = '[LightboxMedia] load() failed on: HLS'
				this.dispatch.emit('error', { error, message })
			}
		} else {
			try {
				const plyrOptions: Plyr.Options = {
					muted: this.options.mute,
					loop: { active: this.options.loop },
					tooltips: { controls: this.options.controls },
				}

				this.instance = new Plyr(element, plyrOptions)
			}
			catch (error) {
				const message = '[LightboxMedia] load() failed on: Plyr'
				this.dispatch.emit('error', { error, message })
			}
		}
	}

	private loadYoutube(element: HTMLIFrameElement) {
		let queries = ''
		const src = element.src || '',
			separator = src.includes('?') ? '&' : '?'

		for (const [option, value] of Object.entries(this.options))
			queries += `${option}=${value ? 1 : 0}`

		element.src += `${separator}${queries}`
	}

	load(options?: LightboxVideoOptions) {
		this.dispose()

		const player = this.dom.get('player')
		if (!player) return

		this.options = options ? { ...this.options, ...options } : this.options

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
			this.media.src = `${this.source}&autoplay=1`
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
		if (elements?.length) this.elements = elements

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
					details = adj.target ? await this.content.fetch(adj.target) : {}
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
				text = title?.innerText ?? ''

			if (label) label.replaceChildren(text)
			arrow.setAttribute('data-position', `${index}`)
		}
	}
}

class LightboxNavigator {
	private isSwapping = false
	private pendingContent: HTMLElement | undefined

	constructor(
		private dom: LightboxDOM,
		private animator: LightboxAnimator,
		private media: LightboxMedia,
		private content: LightboxContentService,
		private dispatch: LightboxDispatcher
	) {}

	private async setSwap<T extends ArrowDirections>(target: NonNullable<ArrowGroup[T]['target']>) {
		try { this.pendingContent = await this.content.render(target) }
		catch (error) { this.dispatch.emit('error', { error, message: 'LightboxNavigator.setSwap() failed' }) }

		if (!this.pendingContent) return

		const currentImage = this.dom.get('image'),
			newImage = this.pendingContent?.querySelector(LightboxSelector.Image)

		if (currentImage && newImage) {
			currentImage.replaceWith(newImage)
			this.dom.rebuildCache()
		}
	}

	private async beginSwap() {
		this.media.pause()

		this.dom.toggleDisable()
		this.dom.setState('change')
		await Animation.wait('swap')

		await this.animator.swap('out')
	}

	private async performSwap(index: number) {
		this.dom.updateContent(this.pendingContent)
		this.media.load()
		this.dispatch.emit('update', index)
	}

	private async finishSwap() {
		await this.animator.swap('in')

		await Animation.wait('swap')
		this.dom.setState('open')
		this.dom.toggleDisable()

		this.media.play()
	}

	async swapContent<T extends ArrowDirections>(
		directory: ArrowGroup,
		dir: T
	) {
		const { index, target } = directory[dir]
		if (this.isSwapping || !target) return

		this.isSwapping = true
		await this.setSwap<T>(target)

		if (!this.pendingContent) return

		const message = 'LightboxNavigator] swapContent() failed'
		const timeline = [
			() => this.beginSwap(),
			() => this.performSwap(index),
			() => this.finishSwap(),
		]

		for (const step of timeline)
			await step().catch(error => this.dispatch.emit('error', { error, message }))

		this.isSwapping = false
	}
}

class LightboxLifecycle {
	private currentIndex: number = 0
	private dialog: HTMLDialogElement | null = null
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
			this.dispatch.emit('error', { error, message: '[Lifecycle] prefetch failed' })
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
		await Animation.wait()

		const directory = await this.menu.configure(this.currentIndex, elements)
		this.directory = directory

		await Animation.wait()
		await this.prefetch(this.directory)
	}

	async handleMount(options: LightboxOptions) {
		await this.initialize(options)
		this.registerHandlers()

		this.dom.append()
		this.dialog = document.querySelector('dialog')
	}

	async handleNavigate(dir: ArrowDirections) {
		if (!this.isActive || !Object.keys(this.directory).length) return
		await this.navigator.swapContent<typeof dir>(this.directory, dir)
	}

	async handleOpen() {
		if (this.isActive) return
		this.isActive = true

		this.dom.toggleDisable()
		document.body.style.overflow = 'hidden'

		await this.isReady
		this.dialog?.showModal()

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
		this.dialog?.close()
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
	private readonly root: HTMLDialogElement

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

		this.dom = new LightboxDOM(this.root, this.content, this.dispatch)
		this.media = new LightboxMedia(this.dom, this.dispatch)
		this.menu = new LightboxMenu(this.dom, this.content)
		this.events = new LightboxEvents(this.dom, this.dispatch)

		this.animator = new LightboxAnimator(this.dom)
		this.navigator = new LightboxNavigator(
			this.dom,
			this.animator,
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

	async open(index?: number) {
		if (this.instance) await this.instance?.close()

		const { elements } = this.options
		if (typeof index === 'number' && index < elements.length)
			this.options = { elements, index, target: elements[index] }

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
