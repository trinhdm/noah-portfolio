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
	LightboxAnimations,
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

	private selectors = {
		root: LightboxSelector.Root,
		arrows: '',
		blocks: LightboxBlockSelector.Root,
		body: LightboxSelector.Body,
		container: LightboxSelector.Container,
		content: LightboxSelector.Content,
		exit: '',
		footer: LightboxSelector.Footer,
		html: LightboxSelector.Html,
		icons: LightboxSelector.Icon,
		image: LightboxSelector.Image,
		navigation: LightboxSelector.Navigation,
		player: '',
		video: LightboxSelector.Video,
	} as const satisfies Record<
		// Exclude<keyof LightboxElements, 'arrows' | 'exit' | 'player'>,
		keyof LightboxElements,
		string
	>

	private query<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		const target = this.selectors[key as keyof typeof this.selectors]

		const root = this.root

		if (target) {
			if (key === 'root')
				return root as LightboxElements[K]
			else if (key.endsWith('s') || key === 'html')
				return Array.from(root.querySelectorAll(target) ?? []) as LightboxElements[K]
			return root.querySelector(target) as LightboxElements[K]
		}

		const icons = this.query('icons'),
			navigation = this.query('navigation'),
			video = this.query('video')

		const extended = {
			arrows: Array.from(navigation?.querySelectorAll('[data-direction]') ?? []),
			exit: icons?.find(ic => ic.dataset.icon === 'close'),
			player: video?.querySelector('video') || video?.querySelector('iframe'),
		} as Partial<LightboxElements>

		const value = extended[key as Exclude<K, keyof typeof this.selectors>]
		if (!value) console.warn(`unknown selector for '${key}'`)

		return value as LightboxElements[K]
	}

	private build<K extends keyof typeof this.selectors>(): void {
		const map = {} as LightboxElements,
			selectors = Object.keys(this.selectors) as K[]

		for (const key of selectors)
			map[key] = this.query(key as typeof key)

		this.map = map as LightboxElements
		this.clear()
	}

	rebuild(): void {
		this.build()
		this.clear()
	}

	clear(): void { this.cache.clear() }

	check<K extends keyof LightboxElements>(value: LightboxElements[K]): boolean {
		return value instanceof Node && !document.contains(value)
	}

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		if (this.cache.has(key)) {
			const value = this.cache.get(key) as LightboxElements[K]
			const isStale = Array.isArray(value)
				? value.some(v => this.check(v))
				: this.check(value)

			if (isStale) return this.query(key)
			return value
		}

		const value = (this.map[key] ?? null) as LightboxElements[K]
		this.cache.set(key, value)

		return value
	}

	reset<K extends keyof LightboxElements>(key: K): void {
		if (this.cache.has(key)) this.cache.delete(key)
		const value = (this.query(key) ?? null) as LightboxElements[K]
		this.cache.set(key, value)
	}
}

class LightboxDOM {
	private readonly cache: LightboxCache

	constructor(
		private root: HTMLDialogElement,
		private content: LightboxContentService
	) {
		this.cache = new LightboxCache(this.root)
	}

	async setContent(target: LightboxOptions['target']): Promise<void> {
		const wrapper = this.cache.get('content')
		if (!wrapper) return

		const rendered = await this.content.render(target)
		if (!rendered) return

		wrapper.replaceChildren(...rendered.children)
		this.rebuildCache()
	}

	updateContent(content: HTMLElement | undefined): void {
		const wrapper = this.cache.get('content')
		if (!wrapper || !content) return

		const selectors = Object.values(LightboxSelector)

		for (const child of wrapper.children) {
			const target = selectors.find(cl => child.classList.contains(cl.slice(1)))
			if (!target) continue

			const element = target.substring(target.lastIndexOf('_') + 1),
				replacement = content.querySelector(target)

			if (replacement) {
				child.replaceWith(replacement)
				this.reset(element as keyof LightboxElements)
			}
		}
	}

	onChange = (
		attr: string,
		callback: (current: string | null, observer: MutationObserver) => void
	) => {
		const mutationObserver = new MutationObserver(mutationList => {
			for (const mutate of mutationList) {
				if (mutate.attributeName !== attr) continue

				const { oldValue, target } = mutate,
					newValue = (target as typeof this.root).getAttribute(attr)

				if (newValue !== oldValue) {
					callback(newValue, mutationObserver)
					break
				}
			}
		})

		mutationObserver.observe(this.root, { attributes: true, attributeOldValue: true })
		return mutationObserver
	}

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		return this.cache.get(key)
	}

	reset<K extends keyof LightboxElements>(key: K): void { this.cache.reset(key) }

	toggleDisable(): void { toggleDisableAttr(this.root) }

	toggleIcons(): void { this.cache.get('icons').forEach(c => c.disabled = !c.disabled) }

	clearCache(): void { this.cache.clear() }

	rebuildCache(): void { this.cache.rebuild() }

	append(): void { document.body.appendChild(this.root) }

	remove(): void { this.root.remove() }

	getState(): LightboxStates { return this.root.dataset.state as LightboxStates }

	setState(state: LightboxStates): void { this.root.dataset.state = state }

	setAnimate(value: LightboxAnimations = ''): void { this.root.dataset.animate = value }
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
		this.queue.clear()

		if (root.hasAttribute('data-animate'))
			root.removeAttribute('data-animate')
	}

	async swap(direction: 'in' | 'out') {
		this.dom.setAnimate(direction)

		const isMediaAsync = direction === 'out',
			targetBlock = this.dom.get('html').at(isMediaAsync ? -1 : -2)

		this.fadeBlocks()
		this.dom.toggleIcons()
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

	private fadeBlocks(): void {
		let blocks = this.dom.get('html')
		if (!blocks?.length) return

		const delay = .3,
			stagger = .15

		const state = this.dom.getState(),
			isSwapIn = state === 'change' && this.dom.get('root').dataset.animate === 'in'

		const stateDelay = {
			change: isSwapIn ? delay : delay * 3,
			close: delay,
			open: 0,
		}[state]

		const innerDelay = {
			change: isSwapIn ? delay * 3 : delay + stagger,
			close: 0,
			open: delay + stagger,
		}[state]

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
				slower = imageDelay >= videoDelay ? image : video

			await this.animator.waitForEnd(slower)
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

		private fadeMain() {
			this.animator.animate('container')
			this.animator.animate('body')

			if (this.dom.getState() === 'close')
				this.dom.setAnimate('overlay')
		}

		async fadeIn() {
			const targetBlock = this.dom.get('html').at(-1)

			this.dom.setState('open')
			this.dom.setAnimate()

			this.fadeMain()
			await this.animator.waitForEnd(this.dom.get('container'))

			this.animator.fadeBlocks()
			await this.animator.waitForEnd(targetBlock)

			this.animator.fadeArrows(true)
			await this.animator.Media.fadeAll?.()
			this.animator.animate('exit')

			await this.animator.waitForFinish()
		}

		async fadeOut() {
			const targetArrow = this.dom.get('arrows').at(-1),
				targetBlock = this.dom.get('html').at(-1)

			this.dom.setState('close')
			this.dom.setAnimate()

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
	private currentFocus: HTMLElement | undefined
	private handlers: Array<() => void> = []

	constructor(
		private dom: LightboxDOM,
		private dispatch: LightboxDispatcher
	) {}

	private handleClick(
		target: HTMLElement,
		callback: (e: MouseEvent) => void
	) {
		const handler = (e: MouseEvent) => { e.preventDefault(); callback?.(e) }
		target.addEventListener('click', handler)
		this.handlers.push(() => target.removeEventListener('click', handler))
	}

	private bindClicks() {
		const arrows = this.dom.get('arrows'),
			exit = this.dom.get('exit'),
			root = this.dom.get('root')

		if (root) {
			this.handleClick(root, (event: MouseEvent) => {
				event.stopPropagation()
				if (event.target !== event.currentTarget) return
				this.dispatch.emit('close')
			})
		}

		if (exit) this.handleClick(exit, () => this.dispatch.emit('close'))

		for (const arrow of arrows) {
			const direction = arrow.dataset.direction as ArrowDirections
			this.handleClick(arrow, () => this.dispatch.emit('navigate', direction))
		}
	}

	private bindKeys() {
		const icons = this.dom.get('icons')

		const keyHandlers = {
			ArrowDown: () => this.dispatch.emit('navigate', 'next'),
			ArrowLeft: () => this.dispatch.emit('navigate', 'prev'),
			ArrowRight: () => this.dispatch.emit('navigate', 'next'),
			ArrowUp: () => this.dispatch.emit('navigate', 'prev'),
			Escape: () => this.dispatch.emit('close'),
		} as const

		const handleKey = (event: KeyboardEvent) => {
			event.stopPropagation()

			const { key, target } = event as {
				key: keyof typeof keyHandlers | 'Enter'
				target: HTMLElement | null
			}

			if (target?.hasAttribute('disabled'))
				event.preventDefault()

			if (key === 'Enter') {
				const isIconFocused = icons.some(ic => ic === document.activeElement)

				if (isIconFocused) {
					this.currentFocus = document.activeElement as HTMLElement
					this.dom.onChange('data-disabled', (value, observer) => {
						if (value === 'false' && this.currentFocus) {
							this.currentFocus.focus()
							this.currentFocus = undefined
							observer.disconnect()
						}
					})
				}

				return
			}

			return keyHandlers[key]?.()
		}

		window.addEventListener('keydown', handleKey)
		this.handlers.push(() => window.removeEventListener('keydown', handleKey))
	}

	private bindFocus() {
		const root = this.dom.get('root')

		const handleFocus = (event: FocusEvent) => {
			event.stopPropagation()
			if (root === document.activeElement && root.childElementCount)
				(root.children[0] as HTMLElement).focus()
		}

		root.addEventListener('focusin', handleFocus)
		this.handlers.push(() => root.removeEventListener('focusin', handleFocus))
	}

	bind(): void {
		this.unbind()

		this.bindClicks()
		this.bindKeys()
		this.bindFocus()
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

		if (this.instance) {
			this.media = player
			this.source = player.src
			player.setAttribute('autofocus', '')
		}
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

	private async setSwap<T extends ArrowDirections>(
		target: NonNullable<ArrowGroup[T]['target']>,
		element: keyof FilterObjArrs<LightboxElements> = 'image'
	) {
		try { this.pendingContent = await this.content.render(target) }
		catch (error) { this.dispatch.emit('error', { error, message: 'LightboxNavigator.setSwap() failed' }) }

		if (!this.pendingContent) return

		const key = element.charAt(0).toUpperCase() + element.slice(1),
			selector = LightboxSelector[key as keyof typeof LightboxSelector]
		console.log({ key, selector })

		if (selector) {
			const currentEl = this.dom.get(element),
				newEl = this.pendingContent.querySelector(selector)

			if (currentEl && newEl) {
				currentEl.replaceWith(newEl)
				this.dom.reset(element)
			}
		}
	}

	private async beginSwap() {
		this.media.pause()

		this.dom.toggleDisable()
		this.dom.setState('change')
		await Animation.wait('swap')
	}

	private async performSwap() {
		await this.animator.swap('out')
		this.dom.updateContent(this.pendingContent)
		this.media.load()
		await this.animator.swap('in')
	}

	private async finishSwap(index: number) {
		await this.dispatch.emit('update', index)

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

		const message = 'LightboxNavigator.swapContent() failed'
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

		this.dom = new LightboxDOM(this.root, this.content)
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
