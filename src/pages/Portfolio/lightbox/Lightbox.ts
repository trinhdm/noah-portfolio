import Hls from 'hls.js'
import Plyr from 'plyr'

import { fetchContent, getPage } from '../../../global/fetch.ts'
import { findChildBy, wrapTrimEl } from '../../../global/utils.ts'
import { findElement, setContent } from '../../../utils/content'
import { setAnimation } from '../../../utils/css'

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
	async fetchPageHtml(page: PageGroup | undefined): Promise<string | undefined> {
		if (!page) return undefined
		return await fetchContent(page)
	}

	async loadBlockContent(target: HTMLElement): Promise<HTMLDivElement | undefined> {
		const page = getPage(target),
			fragment = await setContent({ block: target, page })
		return fragment ?? undefined
	}
}

class LightboxDOM {
	private cache: Partial<LightboxElements> = {}
	private root: HTMLDivElement

	constructor(private options: LightboxOptions) {
		this.root = this.createRoot(this.options)
	}

	private createRoot({ content, properties = {} }: Pick<LightboxOptions, 'content' | 'properties'>) {
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

		if (!menu) return

		menu.removeAttribute('data-hidden')
		arrows?.forEach((direction, index) => {
			const arrowBtn = menu?.querySelector(`.lightbox__${direction}-button`) as HTMLButtonElement | undefined
			if (!arrowBtn) return

			setAnimation(arrowBtn, { index, stagger: .175 })
			this.reset(arrowBtn)
		})
	}

	fadeBlocks(
		isActive: boolean,
		className: `${LightboxClass.Root}__${string}` = `${LightboxClass.Root}__html`
	) {
		const blocks = this.dom.get('blocks')
		if (!blocks?.length) return

		let elements = [...blocks],
			start: number = Number(window.getComputedStyle(blocks[0]).getPropertyValue('animation-duration'))

		if (!isActive) {
			elements = [...blocks].slice().reverse()
			start = 0
		}

		elements.filter(block => block.classList.contains(className))
			.forEach((htmlBlock, index) => {
				setAnimation(htmlBlock, { index, stagger: .125, start })
				this.reset(htmlBlock)
			})
	}

	fadeElement(element: HTMLElement) {
		this.reset(element)
	}

	fadeInRoot() {
		this.dom.toggleDisable()
		this.dom.setState('open')
		this.reset(this.dom.get('root'))
	}

	fadeOutRoot() {
		this.dom.toggleDisable()
		this.dom.setState('close')
		this.reset(this.dom.get('root'))
	}

	async fadeInMedia() {
		const image = this.dom.get('image'),
			video = this.dom.get('video')

		if (!image || !video) return

		this.fadeElement(video)
		await this.waitForAnimationEnd(video)

		this.fadeElement(image)
		await this.waitForAnimationEnd(image)
		image.remove()
	}

	async waitForAnimationEnd(
		el: HTMLElement | undefined, event = 'animationend',
		timeout = 1000
	): Promise<void> {
		if (!el) return
		await Promise.race([
			new Promise<void>(resolve => {
				const onEnd = () => { el.removeEventListener(event, onEnd); resolve() }
				el.addEventListener(event, onEnd, { once: true })
			}),
			new Promise<void>(resolve => setTimeout(resolve, timeout)),
		])
	}

	// async waitForAnimationEnd(el: HTMLElement | undefined, event = 'animationend'): Promise<void> {
	// 	if (!el) return
	// 	await new Promise<void>(resolve => {
	// 		const onEnd = () => { el.removeEventListener(event, onEnd); resolve() }
	// 		el.addEventListener(event, onEnd, { once: true })
	// 	})
	// }
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
	private instance: any | undefined = null

	constructor(private dom: LightboxDOM) {}

	async configure() {
		const video = this.dom.get('video')
		if (!video) return

		const embed = video.querySelector('video') as HTMLVideoElement | undefined,
			iframe = video.querySelector('iframe') as HTMLIFrameElement | undefined

		if (embed) this.setup.embed(embed)
		else if (iframe) this.setup.iframe(iframe)

		const image = this.dom.get('image')
		if (!image) return

		;(image as HTMLElement).style.maxHeight = `${(video as HTMLElement).offsetHeight}px`
		// animator.fadeElement(video)

		// await animator.waitForAnimationEnd(video)
		// animator.fadeElement(image)

		// await animator.waitForAnimationEnd(image)
		// image.remove()
	}

	dispose() {
		if (this.instance) {
			try {
				this.instance.destroy()
			} catch (err) {}
		}
		this.instance = null
	}

	private play(media: HTMLIFrameElement | HTMLVideoElement | undefined) {
		const video = this.dom.get('video')!

		const handler = () => {
			video.removeEventListener('animationend', handler)
			if (media instanceof HTMLVideoElement)
				media.play()
			else if (media instanceof HTMLIFrameElement)
				media.src = `${media.src}&autoplay=1&mute=1`
		}

		video.addEventListener('animationend', handler)
	}

	private setup = {
		embed: (embed: HTMLVideoElement) => {
			const source = embed.src ?? ''

			if (Hls.isSupported()) {
				this.instance = new Hls()

				this.instance.loadSource(source)
				this.instance.attachMedia(embed)
				embed.pause()
				;(window as any).hls = this.instance

				this.play(embed)

				// this.instance.on(Hls.Events.MANIFEST_PARSED, () => {
				// 	const player = new Plyr(embed, {})
				// 	embed.play()
				// })
			} else {
				new Plyr(embed)
				// const player = new Plyr(embed)
			}
		},
		iframe: (iframe: HTMLIFrameElement) => {
			this.play(iframe)
		}
	}
}

class LightboxNavigation {
	private elements: LightboxOptions['elements']
	private navigation: ArrowsGroup = {} as ArrowsGroup

	constructor(
		private dom: LightboxDOM,
		private options: LightboxOptions,
		private contentService = new ContentService()
	) {
		this.elements = this.options.elements
	}

	getPointers(index: number) {
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

				const title = findChildBy(navWrapper, { tagName: 'strong' }),
					text = wrapTrimEl(title, 'span') ?? document.createElement('span')

				value = { ...value, target, rawTarget, text }
			}

			return [direction, value] as const
		}))

		this.navigation = Object.fromEntries(entries) as ArrowsGroup

		return this.navigation
	}

	async setArrows(
		index: number,
		onNavigate: (direction: DirectionsList) => void
	) {
		await this.createMenu(index)
		const directions = Object.keys(this.navigation) as (DirectionsList)[],
			menu = this.dom.get('navigation')

		if (!directions?.length) return

		directions.forEach((direction, i) => {
			const arrow = menu?.querySelector(`.lightbox__arrow--${direction}`),
				item = (this.navigation as ArrowsGroup)[direction]

			if (!arrow) return

			const oldArrow = [...arrow.children].find(child => child.tagName.toLowerCase() === 'span') as HTMLElement | undefined

			if (!!oldArrow)
				arrow.removeChild(oldArrow)

			if (item?.text) {
				arrow.setAttribute('data-position', `${item.index}`)

				if (i % 2 === 0) arrow.prepend(item.text)
				else arrow.append(item.text)

				const handler = (event: Event) => {
					event.preventDefault()
					onNavigate(direction)
				}

				arrow.addEventListener('click', handler)
				;(arrow as any).__lightboxHandler = handler
			} else {
				arrow.remove()
			}
		})
	}

	async swapContent(
		direction: DirectionsList,
		animator: LightboxAnimation,
		media: LightboxMedia
	) {
		const item = (this.navigation as any)[direction]
		if (!Object.hasOwn(item, 'target')) return

		try {
			const { index, target } = item
			const newContent = await this.contentService.loadBlockContent(target)

			this.dom.toggleDisable()
			this.dom.setState('change')
			animator.fadeBlocks(false)

			await animator.waitForAnimationEnd(this.dom.get('video'))
			media.dispose()

			await new Promise(res => setTimeout(res, 50))
			this.dom.update(newContent)
			await this.createMenu(index)
			media.configure()

			// const image = this.dom.get('image')!
			// animator.fadeElement(image)
			// await animator.waitForAnimationEnd(image)

			this.dom.setState('open')
			animator.fadeBlocks(true)

			await animator.waitForAnimationEnd(Array.from(this.dom.get('blocks')!).at(-1))
			animator.fadeInMedia()

			await animator.waitForAnimationEnd(this.dom.get('video'))
			this.dom.toggleDisable()
		} catch (err) { console.error('lightbox swap failed', err) }
	}
}

export class LightboxController {
	private readonly dom: LightboxDOM
	private readonly animator: LightboxAnimation
	private readonly events: LightboxEvents
	private readonly media: LightboxMedia
	private readonly navigator: LightboxNavigation
	private isActive: boolean = false

	constructor(private options: LightboxOptions) {
		this.dom = new LightboxDOM(this.options)
		this.animator = new LightboxAnimation(this.dom)
		this.navigator = new LightboxNavigation(this.dom, this.options, new ContentService())
		this.media = new LightboxMedia(this.dom)
		this.events = new LightboxEvents(this.dom, this)

		this.dom.append()
		this.media.configure()
		this.events.bind()
		this.setInitialArrows()
	}

	private async setInitialArrows() {
		await this.navigator.setArrows(this.options.index, (dir) => this.navigate(dir))
	}

	private async navigate(direction: DirectionsList) {
		if (!this.isActive) return
		await this.navigator.swapContent(direction, this.animator, this.media)
	}

	async open() {
		if (this.isActive) return
		this.isActive = true

		this.animator.fadeInRoot()
		await this.animator.waitForAnimationEnd(this.dom.get('body'))
		this.animator.fadeInMedia()

		try {
			const arrows = this.dom.get('navigation')?.querySelectorAll('button')!,
				blocks = this.dom.get('blocks')!

			this.animator.fadeBlocks(true)

			const beforeLastBlock = Array.from(blocks).at(-2)
			if (beforeLastBlock)
				await this.animator.waitForAnimationEnd(beforeLastBlock)

			this.animator.fadeArrows(this.navigator.getPointers(this.options.index))

			const lastArrow = Array.from(arrows).at(-1)
			if (lastArrow)
				await this.animator.waitForAnimationEnd(lastArrow)

			this.dom.toggleDisable()
		} catch (err) { console.error('lightbox elements failed to animate', err) }
	}

	async close() {
		if (!this.isActive) return
		this.isActive = false
		this.animator.fadeOutRoot()

		await this.animator.waitForAnimationEnd(this.dom.get('overlay'))

		this.events.unbind()
		this.media.dispose()
		this.dom.remove()
	}

	toggle() {
		this.isActive ? this.close() : this.open()
	}
}
