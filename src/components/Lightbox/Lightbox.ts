import Hls from 'hls.js'
import Plyr from 'plyr'

import { findElement, toggleDisableAttr, wrapContent } from '../../utils'
import { AnimationService, ContentService } from '../../services'

import type {
	ArrowGroup,
	ArrowDirections,
	LightboxElements,
	LightboxOptions,
} from './lightbox.types'

import template from './template.ts'


enum LightboxClass {
	Root = 'lightbox',
}

class LightboxDOM {
	private cache: Partial<LightboxElements> = {}
	private root: HTMLDivElement

	constructor(
		private options: LightboxOptions,
		private contentService: ContentService
	) {
		this.root = this.createRoot()
	}

	async setContent(): Promise<void> {
		const container = this.root.querySelector('.lightbox__content') as HTMLElement | null
		if (!container) return

		const content = await this.contentService.render(this.options.target)
		if (content) container.replaceChildren(...content.children)
		this.reset()
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

	append() { document.body.appendChild(this.root) }

	remove() { this.root.remove() }

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		const root = this.root,
			base = `.${LightboxClass.Root}`

		if (this.cache[key])
			return this.cache[key] as LightboxElements[K]

		const map: Partial<Record<keyof LightboxElements, any>> = {
			root,
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

	reset() { this.cache = {} }

	setState(state: 'open' | 'change' | 'close') {
		this.root.dataset.state = state

		const overflow = {
			change: null,
			close: 'auto',
			open: 'hidden',
		}[state]

		if (typeof overflow === 'string')
			document.body.style.overflow = overflow
	}

	toggleDisable() {
		toggleDisableAttr(this.root)
	}

	overwrite(newContent: HTMLElement | undefined) {
		const content = this.get('content')
		if (!content || !newContent) return

		content.innerHTML = newContent.innerHTML ?? ''
		this.reset()
	}

	update(newContent: HTMLElement | undefined) {
		const content = this.get('content')
		if (!content || !newContent) return

		Array.from(content.children).forEach(child => {
			const classes = Array.from(child.classList),
				lbClass = classes.find(cl => cl.includes('lightbox')),
				newChild = newContent.querySelector(`.${lbClass}`)

			if (newChild)
				child.replaceWith(newChild)
			else if (classes.some(cl => cl.includes('temp')))
				child.className = classes.filter(cl => !cl.includes('temp')).join(' ')
		})

		this.reset()
	}
}

class LightboxAnimation {
	constructor(private dom: LightboxDOM) {}

	private reset(element: HTMLElement | undefined = this.dom.get('root')) {
		if (!element) return
		const cls = 'lightbox--animated'
		element.classList.remove(cls)
		void element.offsetHeight		// trigger reflow
		element.classList.add(cls)
	}

	fadeArrows(isActive: boolean) {
		const navigation = this.dom.get('pagination'),
			elements = navigation?.querySelectorAll('[data-direction]')

		if (!elements?.length) return

		const values = [...elements as NodeListOf<HTMLDivElement>].map(el => el.dataset.direction),
			directions = isActive ? values : values.reverse()

		directions.forEach((direction, index) => {
			const arrow = navigation?.querySelector(`[data-direction='${direction}'] > button`)

			if (!arrow) return
			AnimationService.set(arrow as HTMLButtonElement, { index, stagger: .25 })
		})
	}

	fadeBlocks(
		isActive: boolean,
		className: `${LightboxClass.Root}__${string}` = `${LightboxClass.Root}__html`
	) {
		const blocks = this.dom.get('blocks')
		if (!blocks?.length) return

		const blockList = [...blocks],
			blockOrder = isActive ? blockList : blockList.slice().reverse()

		blockOrder.filter(block => block.classList.contains(className))
			.forEach((htmlBlock, index) => {
				const delay = !isActive && { delay: .3 }
				AnimationService.set(htmlBlock, { ...delay, index, stagger: .15 })
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

		this.reset(this.dom.get('root'))
		await this.waitForAnimationEnd(this.dom.get('body'))

		this.fadeBlocks(true)

		try {
			await new Promise(res => setTimeout(res, 50))
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

		this.reset(this.dom.get('root'))
		this.fadeArrows(false)

		try {
			await new Promise(res => setTimeout(res, 50))

			const navigation = this.dom.get('pagination'),
				arrows =  navigation?.querySelectorAll('[data-direction]') ?? [],
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

	async waitForAnimationEnd(
		target: HTMLElement | undefined,
		timeoutMs = 50,
		event = 'animationend'
	): Promise<void> {
		if (!target) return

		await new Promise(requestAnimationFrame)

		const styles = window.getComputedStyle(target)
		let delay, duration, nameAnim

		;({
			animationDelay: delay,
			animationDuration: duration,
			animationName: nameAnim,
		} = styles)

		duration = parseFloat(styles.animationDuration) || 0
		delay = parseFloat(styles.animationDelay) || 0

		const totalMs = (duration + delay) * 1000,
			bufferTime = totalMs + timeoutMs

		if (!nameAnim || nameAnim === 'none' || totalMs === 0) return

		return Promise.race([
			new Promise<void>(resolve => {
				const handleEnd = (evt: Event) => {
					if ((evt as AnimationEvent).target !== target) return
					target.removeEventListener(event, handleEnd)
					resolve()
				}

				target.addEventListener(event, handleEnd, { once: true })
			}),
			new Promise<void>(resolve => setTimeout(resolve, bufferTime)),
		])
	}
}

class LightboxEvents {
	private handlers: Array<() => void> = []

	constructor(
		private dom: LightboxDOM,
		private controller: LightboxController
	) {}

	private handleClick(element: HTMLElement) {
		const handler = () => this.controller.close()
		element.addEventListener('click', handler)
		this.handlers.push(() => element.removeEventListener('click', handler))
	}

	bind() {
		const closeBtn = this.dom.get('closeBtn'),
			overlay = this.dom.get('overlay')

		if (closeBtn) this.handleClick(closeBtn)
		if (overlay) this.handleClick(overlay)
	}

	unbind() {
		this.handlers.forEach(handler => handler())
		this.handlers = []
	}
}

class LightboxMedia {
	private instance: any | undefined = undefined
	private media: HTMLIFrameElement | HTMLVideoElement | undefined = undefined
	private source: string = ''

	constructor(private dom: LightboxDOM) {}

	private init(media: HTMLIFrameElement | HTMLVideoElement) {
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

	configure() {
		const video = this.dom.get('video')
		if (!video) return

		const native = video.querySelector('video'),
			youtube = video.querySelector('iframe')

		if (native) this.init(native as HTMLVideoElement)
		else if (youtube) this.init(youtube as HTMLIFrameElement)
	}

	dispose() {
		if (this.instance) {
			try {
				this.instance.destroy()
			} catch (err) {}
		}

		this.instance = null
	}

	play() {
		if (this.media instanceof HTMLVideoElement)
			this.media.play()
		else if (this.media instanceof HTMLIFrameElement)
			this.media.src = `${this.source}&autoplay=1&mute=1`
	}

	pause() {
		if (this.media instanceof HTMLVideoElement)
			this.media.pause()
		else if (this.media instanceof HTMLIFrameElement)
			this.media.src = this.source
	}
}

class LightboxMenu {
	private data: InstanceType<typeof LightboxMenu.Data>
	private view: InstanceType<typeof LightboxMenu.View>

	directory: ArrowGroup = {} as ArrowGroup

	constructor(
		private dom: LightboxDOM,
		private elements: LightboxOptions['elements'],
		private contentService: ContentService
	) {
		this.data = new LightboxMenu.Data(this.elements, this.contentService)
		this.view = new LightboxMenu.View(this.dom)
	}

	async render(
		index: number,
		onNavigate: (direction: ArrowDirections) => void
	) {
		this.directory = await this.data.createDirectory(index)
		this.view.construct(this.directory, onNavigate)
		await this.data.prefetchAdjacent(index).catch(() => {})
	}

	// destroy() {
	// 	this.view.clear()
	// }

	static Data = class {
		constructor(
			private elements: LightboxOptions['elements'],
			private contentService: ContentService
		) {}

		private getPointers(index: number) {
			const max = this.elements.length,
				next = index + 1 < max ? index + 1 : 0,
				prev = index - 1 >= 0 ? index - 1 : max - 1

			return {
				next: {
					index: next,
					target: this.elements[next],
				},
				prev: {
					index: prev,
					target: this.elements[prev],
				},
			} as ArrowGroup
		}

		async createDirectory(index: number): Promise<ArrowGroup> {
			const pointers = this.getPointers(index),
				directions = Object.keys(pointers) as ArrowDirections[]

			const directory = Object.fromEntries(
				await Promise.all(
					directions.map(async direction => {
						const { target: currentTarget, ...rest } = pointers[direction]
						const target = findElement(currentTarget)
						let props: ArrowGroup[typeof direction] = { ...rest, target }

						if (target) {
							const details = await this.contentService.retrieve(target)
							props = { ...props, ...details }
						}

						return [direction, props] as const
					})
				)
			) as ArrowGroup

			return directory
		}

		async prefetchAdjacent(index: number) {
			const directory = await this.createDirectory(index),
				tasks: Promise<void>[] = []
			const { next, prev } = directory

			if (next?.target && next.index !== index)
				tasks.push(this.contentService.prefetch(next.target))
			if (prev?.target && prev.index !== index)
				tasks.push(this.contentService.prefetch(prev.target))

			await Promise.allSettled(tasks)
		}
	}

	static View = class {
		private handlers = new WeakMap<HTMLElement, (e: Event) => void>()

		constructor(private dom: LightboxDOM) {}

		configure<T extends ArrowDirections>(
			target: ArrowGroup[T],
			direction: ArrowDirections,
			handler: () => void
		) {
			const navigation = this.dom.get('pagination'),
				arrow = navigation?.querySelector(`[data-direction='${direction}']`) as HTMLDivElement | undefined

			if (!arrow) return

			arrow.setAttribute('data-position', `${target.index}`)

			const arrowText = arrow.querySelector('.pagination__text')
			if (!!arrowText && target.title) {
				const text = wrapContent(target.title, 'strong')?.innerText
				arrowText.replaceChildren(text ?? '')
			}

			arrow.addEventListener('click', handler)
			this.handlers.set(arrow, handler)

			return arrow
		}

		construct(
			directory: ArrowGroup,
			onNavigate: (direction: ArrowDirections) => void
		) {
			const directions = (Object.keys(directory) as (ArrowDirections)[]).reverse()

			for (const direction of directions) {
				const handler = () => onNavigate(direction)
				const target = (directory as ArrowGroup)[direction]
				this.configure<typeof direction>(target, direction, handler)
			}
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
		private menu: LightboxMenu,
		private contentService: ContentService,
		private onNavigate: (direction: ArrowDirections) => void
	) {}

	private async configureSwap(target: ArrowGroup[ArrowDirections]['target']) {
		const image = this.dom.get('image')
		if (!image || !target) return

		try {
			this.newContent = await this.contentService.render(target)
			const newImage = this.newContent?.querySelector('.lightbox__image') as HTMLElement | undefined

			if (newImage) {
				newImage.classList.add('lightbox__temp')
				image.replaceWith(newImage)
			}
		} catch (err) {
			console.error('lightbox swap failed', err)
		} finally {
			this.dom.reset()
			await new Promise(res => setTimeout(res, 50))
		}
	}

	private async preSwap() {
		this.media.pause()
		this.dom.toggleDisable()
		this.events.unbind()
		await new Promise(res => setTimeout(res, 1000))		// buffer after pausing

		this.dom.setState('change')
		this.animator.fadeBlocks(false)
		await new Promise(res => setTimeout(res, 50))

		const blocks = this.dom.get('blocks') ?? [],
			targetBlock = Array.from(blocks).at(-1)

		await this.animator.waitForAnimationEnd(targetBlock)
		await this.animator.fadeMedia?.(true)
		this.media.dispose()
	}

	private async performSwap() {
		const image = this.dom.get('image')!,
			{ animationName } = image.style

		this.dom.update(this.newContent)
		this.media.configure()
		image.style.animationName = 'none'

		this.dom.setState('open')
		this.animator.fadeBlocks(true)
		await new Promise(res => setTimeout(res, 50))

		const blocks = this.dom.get('blocks') ?? [],
			targetBlock = Array.from(blocks).at(-1)

		await this.animator.waitForAnimationEnd(targetBlock, 1000)

		requestAnimationFrame(() => {
			setTimeout(() => (image.style.animationName = animationName), 0)
		})

		await this.animator.fadeMedia?.()
	}

	private async postSwap(index: number) {
		await this.menu.render(index, direction => this.onNavigate(direction))

		this.media.play()
		this.events.bind()
		this.dom.toggleDisable()
	}

	async swapContent(direction: ArrowDirections) {
		if (this.isSwapping) return
		this.isSwapping = true

		const { index, target } = this.menu.directory[direction]

		try {
			await this.configureSwap(target)
			await this.preSwap()
			await this.performSwap()
			await this.postSwap(index)
		} catch (err) {
			console.error('lightbox swap failed', err)
		} finally {
			this.isSwapping = false
		}
	}
}

export class LightboxController {
	private readonly contentService: ContentService
	private readonly dom: LightboxDOM
	private readonly menu: LightboxMenu
	private readonly animator: LightboxAnimation
	private readonly events: LightboxEvents
	private readonly media: LightboxMedia
	private readonly navigator: LightboxNavigation
	private isActive: boolean = false

	constructor(private options: LightboxOptions) {
		this.contentService = new ContentService()

		this.dom = new LightboxDOM(this.options, this.contentService)
		this.media = new LightboxMedia(this.dom)
		this.menu = new LightboxMenu(this.dom, this.options.elements, this.contentService)
		this.events = new LightboxEvents(this.dom, this)

		this.animator = new LightboxAnimation(this.dom)
		this.navigator = new LightboxNavigation(
			this.dom,
			this.animator,
			this.events,
			this.media,
			this.menu,
			this.contentService,
			direction => this.navigate(direction)
		)

		this.dom.append()
		void this.initialize()
	}

	private async initialize() {
		await this.dom.setContent()
		this.media.configure()
		await this.showMenu()
	}

	private async showMenu() {
		await this.menu.render(this.options.index, dir => this.navigate(dir))
	}

	private async navigate(direction: ArrowDirections) {
		if (!this.isActive) return
		await this.navigator.swapContent(direction)
	}

	async open() {
		if (this.isActive) return
		this.isActive = true

		try {
			this.dom.toggleDisable()
			await new Promise(res => setTimeout(res, 50))	// buffer for image.maxHeight
			await this.animator.fadeRootIn()
			this.media.play()

			const navigation = this.dom.get('pagination'),
				arrows =  navigation?.querySelectorAll('[data-direction]') ?? [],
				targetArrow = Array.from(arrows).at(-2) as HTMLButtonElement

			await this.animator.waitForAnimationEnd(targetArrow)
		} catch (err) {
			console.error('lightbox failed to open', err)
		} finally {
			this.events.bind()
			this.dom.toggleDisable()
		}
	}

	async close() {
		if (!this.isActive) return
		this.isActive = false

		try {
			this.media.pause()
			this.events.unbind()

			await new Promise(res => setTimeout(res, 500))	// buffer after pausing
			await this.animator.fadeRootOut()
			await this.animator.waitForAnimationEnd(this.dom.get('overlay'))
		} catch (err) {
			console.error('lightbox failed to close', err)
		} finally {
			this.media.dispose()
			this.dom.remove()
		}
	}

	toggle() {
		this.isActive ? this.close() : this.open()
	}
}
