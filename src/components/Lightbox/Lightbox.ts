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



class LightboxDOM {
	private cache: Partial<LightboxElements> = {}
	private root: HTMLDivElement

	constructor(
		private options: LightboxOptions,
		private content: ContentService
	) { this.root = this.createRoot() }

	async setContent(target: LightboxOptions['target']): Promise<void> {
		const wrapper = this.root.querySelector(LightboxSelector.Content)
		if (!wrapper) return

		const content = await this.content.render(target)
		if (content) (wrapper as HTMLElement).replaceChildren(...content.children)
		this.resetCache()
	}

	updateContent(newContent: HTMLElement | undefined): void {
		const content = this.get('content')
		if (!content || !newContent) return

		Array.from(content.children).forEach(child => {
			const classList = Array.from(child.classList),
				baseClass = classList.find(cl => cl.includes(LightboxClass.Root)),
				replacement = newContent.querySelector(`.${baseClass}`)

			if (replacement)
				child.replaceWith(replacement)
		})

		this.resetCache()
	}

	private createRoot(): HTMLDivElement {
		const root = document.createElement('div') as HTMLDivElement

		root.classList.add(LightboxClass.Root)
		root.innerHTML = template

		const { properties } = this.options

		if (properties) {
			const ignore = ['innerHTML', 'innerText', 'outerHTML', 'textContent']

			Object.entries(properties).forEach(([prop, value]) => {
				if (!ignore.includes(prop))
					(root as any)[prop] = value
			})
		}

		return root
	}

	append(): void { document.body.appendChild(this.root) }

	remove(): void { this.root.remove() }

	getState() { return this.root.dataset.state as LightboxStates }

	toggleDisable(): void { toggleDisableAttr(this.root) }

	resetCache(): void { this.cache = {} }

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		const root = this.root

		if (this.cache[key])
			return this.cache[key] as LightboxElements[K]

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

		this.cache[key] = (map[key] ?? null) as LightboxElements[K]

		return this.cache[key] as LightboxElements[K]
	}

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
		const cls = LightboxClass.Animation
		element.classList.remove(cls)
		void element.offsetHeight		// trigger reflow
		element.classList.add(cls)
	}

	fadeArrows(isActive: boolean): void {
		const arrows = Array.from(this.dom.get('arrows') ?? [])
		if (!arrows?.length) return

		const values = arrows.map(el => el.dataset.direction),
			directions = isActive ? values : values.reverse()

		directions.forEach((dir, index) => {
			const arrowBtn = arrows.find(arrow => (
				arrow.dataset.direction === dir
			))?.querySelector('button')

			if (!arrowBtn) return
			Animation.set(arrowBtn as HTMLButtonElement, { index, stagger: .25 })
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

	async fadeMedia(isAsync: boolean = false) {
		const image = this.dom.get('image'),
			video = this.dom.get('video')

		if (!image || !video) return

		if (isAsync) {
			Animation.set(video)
			Animation.set(image)

			const imageDelay = parseFloat(image.style.animationDelay),
				videoDelay = parseFloat(video.style.animationDelay),
				slowerMedia = imageDelay >= videoDelay ? image : video

			await Animation.waitForEnd(slowerMedia)
		} else {
			Animation.set(video)
			await Animation.waitForEnd(video)

			Animation.set(image)
			await Animation.waitForEnd(image)
		}
	}

	async fadeRootIn() {
		this.dom.setState('open')

		this.reflow(this.dom.get('root'))
		await Animation.waitForEnd(this.dom.get('body'))

		this.fadeBlocks()

		try {
			await Animation.wait()
			const blocks = this.dom.get('blocks') ?? [],
				targetBlock = Array.from(blocks).at(-2)

			await Animation.waitForEnd(targetBlock)
		}
		catch (err) { console.warn('[LightboxAnimation] fadeRootIn() failed', err) }
		finally {
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
			await Animation.wait()

			const arrows =  this.dom.get('arrows') ?? [],
				[targetArrow] = Array.from(arrows) as HTMLButtonElement[]

			await Animation.waitForEnd(targetArrow)
			this.fadeBlocks()

			const [firstBlock] = this.dom.get('blocks') ?? []
			await Animation.waitForEnd(firstBlock)

			Animation.set(this.dom.get('body'))
			Animation.set(this.dom.get('container'))

			await this.fadeMedia?.()
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
	private instance: any | undefined = undefined
	private media: HTMLIFrameElement | HTMLVideoElement | undefined = undefined
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

	async store(elements: LightboxOptions['elements']) {
		this.elements = elements
		return this.elements
	}

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
		finally {
			this.dom.resetCache()
			await Animation.wait()
		}
	}

	private async beforeSwap() {
		try {
			this.media.pause()
			this.dom.toggleDisable()
			this.events.unbind()
			await Animation.wait('swap')
		}
		catch (err) { console.warn('[LightboxNavigation] beforeSwap() failed:', err) }
		finally { this.dom.setState('change') }
	}

	private async preSwap() {
		this.animator.fadeBlocks()

		try {
			const targetBlock = Array.from(this.dom.get('blocks') ?? []).at(-2)
			await Animation.waitForEnd(targetBlock)
		}
		catch (err) { console.warn('[LightboxNavigation] preSwap() failed:', err) }
		finally { await this.animator.fadeMedia?.(true) }
	}

	private async performSwap() {
		if (!this.newContent) return

		try {
			await Animation.wait('pause')
			this.dom.updateContent(this.newContent)
			this.media.configure()
		}
		catch (err) { console.warn('[LightboxNavigation] performSwap() failed:', err) }
		finally { this.dom.setState('open') }
	}

	private async postSwap() {
		this.animator.fadeBlocks()

		try {
			const targetBlock = Array.from(this.dom.get('blocks') ?? []).at(-2)
			await Animation.waitForEnd(targetBlock)
		}
		catch (err) { console.warn('[LightboxNavigation] postSwap() failed:', err) }
		finally { await this.animator.fadeMedia?.() }
	}

	private async afterSwap(index: number) {
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
		catch (err) { console.warn('[LightboxNavigation] afterSwap() failed:', err) }
		finally { this.dom.toggleDisable() }
	}

	async swapContent<T extends ArrowDirections>(
		directory: ArrowGroup,
		dir: T
	) {
		if (this.isSwapping) return
		this.isSwapping = true

		const { index, target } = directory[dir]
		if (!target) return

		try {
			await this.setupSwap(target)
			await this.beforeSwap()
			await this.preSwap()
			await this.performSwap()
			await this.postSwap()
			await this.afterSwap(index)
		}
		catch (err) { console.warn('[LightboxNavigation] swapContent() failed:', err) }
		finally { this.isSwapping = false }
	}
}

export class LightboxController {
	private readonly dom: LightboxDOM
	private readonly menu: LightboxMenu
	private readonly animator: LightboxAnimation
	private readonly events: LightboxEvents
	private readonly media: LightboxMedia
	private readonly navigator: LightboxNavigation

	private readonly content: ContentService
	private readonly dispatcher: EventDispatcher<LightboxEventMap>
	private currentIndex: number = 0
	private directory: ArrowGroup = {} as ArrowGroup
	private elements: LightboxOptions['elements'] = []
	private isActive: boolean = false

	constructor(private options: LightboxOptions) {
		this.content = new ContentService()
		this.dispatcher = new EventDispatcher()

		this.dom = new LightboxDOM(this.options, this.content)
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

		this.dom.append()
		this.registerDefaultHandlers()
		void this.dispatcher.emit('ready', this.options)
	}

	private registerDefaultHandlers(): void {
		this.dispatcher.on('ready', this.handleReady.bind(this))
		this.dispatcher.on('open', this.handleOpen.bind(this))
		this.dispatcher.on('close', this.handleClose.bind(this))
		this.dispatcher.on('navigate', this.handleNavigate.bind(this))
		this.dispatcher.on('update', this.handleUpdate.bind(this))
	}

	private async prefetchFrom(directory: ArrowGroup) {
		const adjacentTargets = [] as (HTMLElement | Node | null | undefined)[],
			directions = Object.keys(directory) as ArrowDirections[]

		directions?.forEach(pointer => {
			const { target } = directory[pointer]
			if (!!target) adjacentTargets.push(target)
		})

		 if (!adjacentTargets.length) return
		await this.content.prefetcher(adjacentTargets).catch(() => {})
	}

	private async handleUpdate(index: number) {
		this.currentIndex = index ?? 0
		const directory = await this.menu.generate(this.currentIndex)

		this.directory = directory
		await this.prefetchFrom(this.directory)
	}

	private async handleReady({ elements, index, target }: LightboxOptions) {
		this.elements = elements ?? []

		await this.dom.setContent(target)
		this.media.configure()

		if (!!this.elements?.length) {
			this.menu.store(this.elements)
			this.dispatcher.emit('update', index)
		}
	}

	private async handleNavigate(dir: ArrowDirections) {
		if (!this.isActive || !Object.keys(this.directory).length) return

		await this.navigator.swapContent<typeof dir>(this.directory, dir)
	}

	private async handleOpen() {
		if (this.isActive) return
		this.isActive = true

		try {
			this.dom.toggleDisable()
			await Animation.wait()				// buffer for image.maxHeight
			await this.animator.fadeRootIn()
			this.media.play()

			const arrows = this.dom.get('arrows') ?? [],
				targetArrow = Array.from(arrows).at(-2) as HTMLButtonElement

			await Animation.waitForEnd(targetArrow)
		}
		catch (err) { console.warn('[handleOpen] failed:', err) }
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

			await Animation.wait('pause')		// buffer after pausing
			await this.animator.fadeRootOut()
			await Animation.waitForEnd(this.dom.get('overlay'))
		}
		catch (err) { console.warn('[handleClose] failed:', err) }
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
