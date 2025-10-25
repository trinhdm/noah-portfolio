import Hls from 'hls.js'
import Plyr from 'plyr'

import { AnimationService } from '../../../utils/AnimationService.ts'
import { fetchContent, getPage } from '../../../global/fetch.ts'
import { findChildBy } from '../../../global/utils.ts'
import { findElement, setContent } from '../../../utils/content'

import type { ArrowsGroup, DirectionsList } from '../block/block.types'
import type { PageGroup } from '../../../global/utils.types'
import type {
	LightboxElements,
	LightboxOptions,
	LightboxProperties,
} from './lightbox.types'

import template from './template'
import './styles'


enum LightboxClass {
	Root = 'lightbox',
	Hidden = 'lightbox--hidden',
}


class ContentService {
	private cache = new Map<string, HTMLDivElement>()

	private async fetchBlock(target: HTMLDivElement) {
		const cloned = target.cloneNode(true) as HTMLDivElement
		return cloned
	}

	async fetchPageHtml(page: PageGroup | undefined): Promise<string | undefined> {
		if (!page) return undefined
		return await fetchContent(page)
	}

	async loadBlockContent(target: HTMLElement): Promise<HTMLDivElement | undefined> {
		const page = getPage(target),
			id = target.dataset.id || target.id || ''

		if (this.cache.has(id)) return this.cache.get(id)

		const fragment = await setContent({ block: target, page })
		if (fragment) this.cache.set(id, fragment)

		return fragment ?? undefined
	}

	async prefetchBlockContent(target: HTMLElement): Promise<void> {
		const page = getPage(target)
		const id = target.dataset.id || target.id || ''
		if (this.cache.has(id)) return

		try {
			const fragment = await setContent({ block: target, page })
			if (fragment) this.cache.set(id, fragment)
		} catch (err) {
			console.warn(`Prefetch failed for ${id}:`, err)
		}
	}
}

class LightboxDOM {
	private cache: Partial<LightboxElements> = {}
	private root: HTMLDivElement

	constructor(private options: LightboxOptions) {
		this.root = this.createRoot(this.options)
	}

	private createRoot({
		content,
		properties = {},
	}: Pick<LightboxOptions, 'content' | 'properties'>) {
		const root = document.createElement('div') as HTMLDivElement

		root.classList.add(LightboxClass.Root)
		root.innerHTML = template.trim()

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

		const container = root.querySelector('.lightbox__content')

		if (container && content)
			container.innerHTML = content.innerHTML

		return root
	}

	append() {
		document.body.appendChild(this.root)
	}

	remove() {
		this.root.remove()
	}

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
			navigation: root.querySelector(`${base}__navigation`),
			overlay: root.querySelector(`${base}__overlay`),
			video: root.querySelector(`${base}__video`),
		}

		this.cache[key] = (map[key] ?? null) as LightboxElements[K]

		return this.cache[key] as LightboxElements[K]
	}

	reset() {
		this.cache = {}
	}

	update(newContent: HTMLElement | undefined) {
		const content = this.get('content')
		if (!content || !newContent) return

		content.innerHTML = newContent.innerHTML ?? ''
		this.reset()
	}

	setProperties(properties: LightboxProperties) {
		Object.entries(properties)
			.forEach(([prop, value]) => this.root.setAttribute(prop, `${value}`))
	}

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
		let isDisabled = true

		if (this.root.hasAttribute('data-disabled')) {
			isDisabled = this.root.dataset.disabled === 'true'
			isDisabled = !isDisabled
		}

		this.setProperties({ 'data-disabled': `${isDisabled}` })
	}
}

class LightboxAnimation {
	constructor(private dom: LightboxDOM) {}

	reset(element: HTMLElement | undefined = this.dom.get('root')) {
		if (!element) return
		const cls = 'lightbox--animated'
		element.classList.remove(cls)
		void element.offsetHeight		// trigger reflow
		element.classList.add(cls)
	}

	fadeArrows(pointers: ArrowsGroup) {
		const arrows = Object.keys(pointers).reverse() as (DirectionsList)[],
			menu = this.dom.get('navigation')

		arrows?.forEach((direction, index) => {
			const arrowBtn = menu?.querySelector(`.lightbox__${direction}-button`) as HTMLButtonElement | undefined

			if (!arrowBtn) return
			AnimationService.set(arrowBtn, { hasReset: false, index, stagger: .175 })
		})
	}

	fadeBlocks(
		isActive: boolean,
		className: `${LightboxClass.Root}__${string}` = `${LightboxClass.Root}__html`
	) {
		const blocks = this.dom.get('blocks')
		if (!blocks?.length) return

		let elements = [...blocks],
			delay: number = parseFloat(window.getComputedStyle(blocks[0]).getPropertyValue('animation-delay'))

		if (!isActive) {
			elements = [...blocks].slice().reverse()
			delay = 0
		}

		const options = {
			// delay,
			// hasReset: false,
			stagger: .125,
		}

		elements.filter(block => block.classList.contains(className))
			.forEach((htmlBlock, index) => {
				AnimationService.set(htmlBlock, { ...options, index })
			})
	}

	fadeInRoot() {
		this.dom.toggleDisable()
		this.dom.setState('open')
		this.reset(this.dom.get('root'))
	}

	async fadeOutRoot() {
		this.dom.toggleDisable()
		this.dom.setState('close')

		this.reset(this.dom.get('root'))

		await this.waitForAnimationEnd(this.dom.get('container'))
		this.dom.get('overlay')!.style.animationPlayState = 'running'
	}

	async fadeInMedia() {
		const image = this.dom.get('image'),
			video = this.dom.get('video')

		if (!image || !video) return

		AnimationService.set(video)
		await this.waitForAnimationEnd(video)

		AnimationService.set(image)
		await this.waitForAnimationEnd(image)
	}

	async waitForAnimationEnd(
		target: HTMLElement | undefined,
		timeoutMs = 1000,
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

	constructor(private dom: LightboxDOM) {}

	private setup(media: HTMLIFrameElement | HTMLVideoElement) {
		this.media = media

		if (media instanceof HTMLVideoElement) {
			const source = media.src ?? ''

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
		}

		if (media instanceof HTMLIFrameElement) {}
	}

	async configure() {
		const video = this.dom.get('video')
		if (!video) return

		const embed = video.querySelector('video'),
			iframe = video.querySelector('iframe')

		if (embed) this.setup(embed as HTMLVideoElement)
		else if (iframe) this.setup(iframe as HTMLIFrameElement)

		const image = this.dom.get('image')
		if (!image) return

		;(image as HTMLElement).style.maxHeight = `${(video as HTMLElement).offsetHeight}px`
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
		const image = this.dom.get('image')!

		const handler = () => {
			image.removeEventListener('animationend', handler)
			image.remove()

			if (this.media instanceof HTMLVideoElement)
				this.media.play()
			else if (this.media instanceof HTMLIFrameElement)
				this.media.src = `${this.media.src}&autoplay=1&mute=1`
		}

		image.addEventListener('animationend', handler, { once: true, passive: true })
	}

	pause() {
		if (this.media instanceof HTMLVideoElement)
			this.media.pause()
	}
}

class LightboxMenu {
	directory: ArrowsGroup = {} as ArrowsGroup

	constructor(
		private dom: LightboxDOM,
		private options: LightboxOptions
	) {}

	getPointers(index: number) {
		const elements = this.options.elements

		const max = elements.length,
			next = index + 1 < max ? index + 1 : 0,
			prev = index - 1 >= 0 ? index - 1 : max - 1

		return {
			next: {
				index: next,
				target: elements[next],
			},
			prev: {
				index: prev,
				target: elements[prev],
			},
		} as ArrowsGroup
	}

	async createMenu(index: number): Promise<ArrowsGroup> {
		const pointers = this.getPointers(index),
			directions = Object.keys(pointers) as (keyof ArrowsGroup)[]

		const entries = await Promise.all(directions.map(async direction => {
			const { target: rawTarget, ...rest } = pointers[direction]
			const target = findElement(rawTarget)
			let value: any = { ...rest, target }

			if (target) {
				const navWrapper = document.createElement('div'),
					newPage = getPage(target)

				navWrapper.innerHTML = (await fetchContent(newPage)) ?? ''

				const text = findChildBy(navWrapper, { tagName: 'strong' })?.innerHTML
				value = { ...value, target, text }
			}

			return [direction, value] as const
		}))

		this.directory = Object.fromEntries(entries) as ArrowsGroup

		return this.directory
	}

	async setArrows(
		index: number,
		onNavigate: (direction: DirectionsList) => void
	) {
		await this.createMenu(index)
		const directions = Object.keys(this.directory) as (DirectionsList)[],
			menu = this.dom.get('navigation')

		if (!directions?.length) return

		directions.forEach(direction => {
			const arrow = menu?.querySelector(`.lightbox__arrow--${direction}`)
			if (!arrow) return

			const item = (this.directory as ArrowsGroup)[direction]

			if (item?.text) {
				arrow.setAttribute('data-position', `${item.index}`)

				const arrowText = arrow.querySelector('.navbar__title')
				if (!!arrowText)
					arrowText.innerHTML = item.text

				const handler = (event: Event) => {
					event.preventDefault()
					onNavigate(direction)
				}

				arrow.addEventListener('click', handler, { once: true })
				;(arrow as any).__lightboxHandler = handler
			}
		})
	}
}

class LightboxNavigation {
	private isSwapping = false

	constructor(
		private dom: LightboxDOM,
		private animator: LightboxAnimation,
		private media: LightboxMedia,
		private menu: LightboxMenu,
		private contentService = new ContentService(),
		private onNavigate?: (direction: DirectionsList) => void
	) {}

	private async preSwap() {
		this.dom.toggleDisable()
		this.dom.setState('change')

		this.media.pause()
		this.animator.fadeBlocks(false)

		await this.animator.waitForAnimationEnd(this.dom.get('video'))
		this.media.dispose()

		await new Promise(res => setTimeout(res, 50))
	}

	private async performSwap(newContent: HTMLDivElement | undefined) {
		this.dom.update(newContent)
		this.media.configure()

		this.dom.setState('open')
		this.animator.fadeBlocks(true)

		await this.animator.waitForAnimationEnd(Array.from(this.dom.get('blocks')!).at(-1))
		this.animator.fadeInMedia()

		await this.animator.waitForAnimationEnd(this.dom.get('video'))
	}

	private async postSwap(index: number) {
		this.dom.reset()
		await this.menu.setArrows(index, direction => this.onNavigate?.(direction))
		await this.prefetchAdjacentBlocks(index)

		this.dom.toggleDisable()
		this.media.play()
	}

	private async prefetchAdjacentBlocks(currentIndex: number) {
		const { next, prev } = this.menu.directory
		const tasks: Promise<any>[] = []

		if (next?.target && next.index !== currentIndex)
			tasks.push(this.contentService.prefetchBlockContent(next.target))
		if (prev?.target && prev.index !== currentIndex)
			tasks.push(this.contentService.prefetchBlockContent(prev.target))

		await Promise.allSettled(tasks)
	}

	async swapContent(direction: DirectionsList) {
		if (this.isSwapping) return
		this.isSwapping = true

		const item = this.menu.directory[direction]
		if (!Object.hasOwn(item, 'target') || !item.target) return

		try {
			await this.preSwap()

			const newContent = await this.contentService.loadBlockContent(item.target)
			await this.performSwap(newContent)

			await this.postSwap(item.index)
		} catch (err) {
			console.error('lightbox swap failed', err)
		} finally {
			this.isSwapping = false
			console.log('swap')
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
	private isActive: boolean = false

	constructor(private options: LightboxOptions) {
		this.dom = new LightboxDOM(this.options)
		this.menu = new LightboxMenu(this.dom, this.options)
		this.media = new LightboxMedia(this.dom)

		this.animator = new LightboxAnimation(this.dom)
		this.navigator = new LightboxNavigation(
			this.dom,
			this.animator,
			this.media,
			this.menu,
			new ContentService(),
			direction => this.navigate(direction)
		)

		this.events = new LightboxEvents(this.dom, this)

		this.dom.append()
		this.media.configure()
		this.events.bind()
		this.setInitialArrows()
	}

	private async setInitialArrows() {
		await this.menu.setArrows(this.options.index, dir => this.navigate(dir))
	}

	private async navigate(direction: DirectionsList) {
		if (!this.isActive) return
		await this.navigator.swapContent(direction)
	}

	async open() {
		if (this.isActive) return
		this.isActive = true

		this.animator.fadeInRoot()
		await this.animator.waitForAnimationEnd(this.dom.get('body'))
		this.animator.fadeInMedia()
		this.animator.fadeBlocks(true)

		try {
			await new Promise(res => setTimeout(res, 50))
			const arrows = this.dom.get('navigation')?.querySelectorAll('button')!,
				blocks = this.dom.get('blocks')!

			const lastBlock = Array.from(blocks).at(-1)
			await this.animator.waitForAnimationEnd(lastBlock)
			this.animator.fadeArrows(this.menu.directory)

			const lastArrow = Array.from(arrows).at(-1)
			await this.animator.waitForAnimationEnd(lastArrow)
		} catch (err) {
			console.error('lightbox failed to open', err)
		} finally {
			this.dom.toggleDisable()
			this.media.play()
		}
	}

	async close() {
		if (!this.isActive) return
		this.isActive = false

		try {
			this.animator.fadeBlocks(false)

			this.animator.fadeOutRoot()
			await this.animator.waitForAnimationEnd(this.dom.get('overlay'), 2000)
			console.log('ENDED')
		} catch (err) {
			console.error('lightbox failed to close', err)
		} finally {
			this.events.unbind()
			this.media.dispose()
			this.dom.remove()
		}
	}

	toggle() {
		this.isActive ? this.close() : this.open()
	}
}
