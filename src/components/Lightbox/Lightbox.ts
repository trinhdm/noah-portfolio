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
	LightboxElements,
	LightboxEventMap,
	LightboxOptions,
	LightboxStates,
	LightboxVideoOptions,
} from './lightbox.types'

import type { Entries } from '../../types'
import type { AnimationOptions, HandlerFor } from '../../services'

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

			for (const [prop, val] of props)
				if (!this.ignored.includes(prop)) root.setAttribute(prop, String(val))
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
			container: root.querySelector(LightboxSelector.Container),
			content: root.querySelector(LightboxSelector.Content),
			footer: root.querySelector(LightboxSelector.Footer),
			icons: Array.from(root.querySelectorAll(LightboxSelector.Icon) ?? []),
			image: root.querySelector(LightboxSelector.Image),
			navigation: root.querySelector(LightboxSelector.Navigation),
			overlay: root.querySelector(LightboxSelector.Overlay),
			video: root.querySelector(LightboxSelector.Video),
		} as Partial<LightboxElements>

		map = {
			...map,
			arrows: Array.from(map.navigation?.querySelectorAll('[data-direction]') ?? []),
			exit: map.icons?.find(ic => ic.dataset.icon === 'close'),
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
		private content: LightboxContentService,
		private dispatch: LightboxDispatcher
	) {
		this.cache = new LightboxCache(this.root)
	}

	setDocument() {
		const state = this.getState()
		if (state === 'change') return

		const docBody = document.body,
			// docMain = docBody.firstElementChild,
			isOpen = state === 'open'

		docBody.style.overflow = isOpen ? 'hidden' : 'auto'
		// if (!docMain) return

		// if (isOpen) {
		// 	docMain.setAttribute('aria-hidden', 'true')
		// 	docMain.setAttribute('tabIndex', '-1')
		// } else {
		// 	docMain.removeAttribute('aria-hidden')
		// 	docMain.removeAttribute('tabIndex')
		// }
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
		await this.Media.fadeAll?.(isMediaAsync)
	}

	private fade(
		key: keyof Omit<LightboxElements, 'arrows' | 'blocks' | 'icons'>,
		options: AnimationOptions = {}
	): void {
		const target = this.dom.get(key)
		if (target) Animation.set(target, options)
	}

	private fadeArrows(isActive: boolean): void {
		const arrows = this.dom.get('arrows')
		if (!arrows?.length) return

		const arrowList = isActive ? arrows : arrows.reverse()

		arrowList.forEach((arrow, index) => {
			const icon = arrow.querySelector(LightboxSelector.Icon)
			if (icon) Animation.set(icon, { index, stagger: .25 })
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

			if (!innerBlock) return
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

		async fadeAll(isAsync: boolean = false) {
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
			this.dom.setDocument()

			// const { classList } = element,
			// 	cls = LightboxClass.Animation

			// if (classList.contains(cls)) classList.remove(cls)
			void element.offsetHeight		// trigger reflow
			// classList.add(cls)
		}

		private async fadeMain() {
			this.animator.fade('container')
			this.animator.fade('body')
			this.animator.fade('overlay')
			await Animation.wait('pause')
		}

		async fadeIn() {
			const targetBlock = this.dom.get('blocks').at(-1)

			this.reflow('open')
			await this.fadeMain()
			await Animation.waitForEnd(this.dom.get('body'))

			this.animator.fadeBlocks()
			await Animation.waitForEnd(targetBlock)

			this.animator.fadeArrows(true)
			await this.animator.Media.fadeAll?.()
			this.animator.fade('exit')
		}

		async fadeOut() {
			const targetArrow = this.dom.get('arrows').at(-1),
				targetBlock = this.dom.get('blocks').at(-2)

			this.reflow('close')
			this.animator.fade('exit')
			await Animation.wait('pause')

			this.animator.fadeArrows(false)
			await Animation.waitForEnd(targetArrow)

			this.animator.fadeBlocks()
			await Animation.waitForEnd(targetBlock)

			await this.animator.Media.fadeAll?.()
			await this.fadeMain()
			await Animation.waitForEnd(this.dom.get('overlay'))
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
				if (!target) return
					console.log(
						{ target },
						this.focusableElements,
						this.focusableElements.find(el => el === document.activeElement)
					)

				if (this.focusableElements.some(el => el === document.activeElement)) target.focus()
				event.preventDefault()
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

		this.bindFocus()
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
		private events: LightboxEvents,
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
			newImage.classList.add(LightboxClass.Temp)
			currentImage.replaceWith(newImage)
			this.dom.rebuildCache()
		}
	}

	private async beginSwap() {
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

	private async finishSwap(index: number) {
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
		await this.setSwap<T>(target)

		if (!this.pendingContent) return

		const message = 'LightboxNavigator] swapContent() failed'
		const timeline = [
			() => this.beginSwap(),
			() => this.performSwap(),
			() => this.finishSwap(index),
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
		container.classList.add(LightboxClass.Error)
		container.appendChild(wrapper)

		this.dom.get('footer')?.appendChild(container)
		console.error(`[Lightbox Error]: ${message}\n`, error)
	}

	private async prefetch(directory: ArrowGroup) {
		if (!this.isActive || !Object.keys(this.directory).length) return

		const adjacentTargets = [] as (HTMLElement | undefined)[],
			directions = Object.keys(directory) as ArrowDirections[]

		for (const dir of directions) {
			const { target } = directory[dir]
			if (!!target) adjacentTargets.push(target)
		}

		if (!adjacentTargets.length) return
		await this.content.prefetcher(adjacentTargets).catch(error => (
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

		if (!!elements?.length) await this.handleUpdate(index, elements)
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

	async handleNavigate(dir: ArrowDirections) {
		if (!this.isActive || !Object.keys(this.directory).length) return
		await this.navigator.swapContent<typeof dir>(this.directory, dir)
	}

	async handleOpen() {
		if (this.isActive) return
		this.isActive = true

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

		this.dom = new LightboxDOM(this.root, this.content, this.dispatch)
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

	async open(index?: number) {
		if (this.instance) await this.instance?.close()

		const { elements } = this.options
		if (typeof index === 'number' && index < elements.length)
			this.options = { elements, index, target: elements[index] }

		const controller = new LightboxController(this.options)
		this.instance = controller
		console.log('old old')

		await controller.mount()
		await controller.open()
	}

	async close() {
		if (!this.instance) return
		await this.instance?.close()
		this.instance = null
	}
}
