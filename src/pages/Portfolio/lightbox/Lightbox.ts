import Hls from 'hls.js'
import Plyr from 'plyr'

import { PageGroup } from '../../../global/utils.types'
import { findElement, setContent } from '../../../utils/content'
import { ArrowsGroup } from '../block/block.types'

import { fetchContent, getPage } from '../../../global/fetch.ts'
import { findChildBy, wrapTrimEl } from '../../../global/utils.ts'

import template from './template'
import { NavigationOptions } from './lightbox.types'
import { setAnimation } from '../../../utils/css'

import '../styles'



enum LightboxClass {
	Root = 'lightbox',
	// Active = 'lightbox--active',
	// Disabled = 'lightbox--disabled',
}

type LightboxProperties<T extends HTMLElement = HTMLDivElement> = Record<keyof T, T[keyof T]> | {}

type LightboxOptions<T extends HTMLElement = HTMLDivElement> = {
	content: HTMLDivElement | undefined
	elements: NodeListOf<HTMLElement>
	index: number
	page: PageGroup | undefined
	properties: Record<keyof T, T[keyof T]> | {};
}

type LightboxElements = {
	blocks: NodeListOf<HTMLElement> | undefined
	body: HTMLElement | undefined
	closeBtn: HTMLElement | undefined
	container: HTMLElement | undefined
	content: HTMLDivElement | undefined
	image?: HTMLImageElement | undefined
	navigation: HTMLElement | undefined
	overlay: HTMLElement | undefined
	root: HTMLDivElement
	video?: HTMLIFrameElement | HTMLVideoElement | undefined
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
		this.root = this.createRoot(options)
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

	addClass(cls: LightboxClass) {
		this.root.classList.add(cls)
	}

	removeClass(cls: LightboxClass) {
		this.root.classList.remove(cls)
	}

	setProperties(properties: LightboxProperties) {
		console.log(properties)

		Object.entries(properties).forEach(([prop, value]) => {
			this.root.setAttribute(prop, `${value}`)
		})
	}

	getState() {
		return this.root.dataset.state
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
}

class LightboxAnimation {
	constructor(private dom: LightboxDOM) {}

	reset(element: HTMLElement | undefined = this.dom.get('root')) {
		if (!element) return
		const cls = 'lightbox--animated'
		element.classList.remove(cls)
		void element.offsetHeight		// trigger reflow
		element.classList.add(cls)
		// console.log('FIRED', element)
	}

	fadeArrows(
		isActive: boolean,
		pointers: ArrowsGroup
	) {
		const directions = Object.keys(pointers) as (keyof NavigationOptions)[],
			menu = this.dom.get('navigation')

		if (!menu || !directions?.length) return

		directions.forEach((direction, index) => {
			const arrowBtn = menu.querySelector(`.lightbox__${direction}-button`) as HTMLButtonElement | undefined
			if (!arrowBtn) return

			const duration = Number(window.getComputedStyle(arrowBtn).getPropertyValue('animation-duration'))

			Object.assign(arrowBtn.style, setAnimation({
				duration,
				index,
				stagger: -0.375,
				start: isActive ? .75 : 0,
			}))

			this.reset(arrowBtn)
		})
	}

	fadeBlocks(
		isActive: boolean,
		className: `${LightboxClass.Root}__${string}` = `${LightboxClass.Root}__html`
	) {
		const blocks = this.dom.get('blocks')

		if (!blocks?.length) return

		;[...blocks].filter(block => block.classList.contains(className))
			.forEach((htmlBlock, index) => {
				const duration = Number(window.getComputedStyle(htmlBlock).getPropertyValue('animation-duration'))

				Object.assign(htmlBlock.style, setAnimation({
					duration,
					index,
					stagger: .125,
					start: isActive ? .75 : 0,
				}))

				this.reset(htmlBlock)
			})
	}

	fadeElement(element: HTMLElement) {
		this.reset(element)
	}

	fadeInRoot() {
		this.dom.setProperties({ 'data-disabled': 'true' })
		this.reset(this.dom.get('root'))
		console.log('FADE IN')
	}

	fadeOutRoot() {
		this.dom.setProperties({ 'data-disabled': 'true' })
		this.reset(this.dom.get('root'))
		console.log('FADE OUT')
	}

	async waitForAnimationEnd(el: HTMLElement | undefined, event = 'animationend'): Promise<void> {
		if (!el) return
		await new Promise<void>(resolve => {
			const onEnd = () => { el.removeEventListener(event, onEnd); resolve() }
			el.addEventListener(event, onEnd, { once: true })
		})
	}
}

class LightboxEvents {
	private handlers: Array<() => void> = []

	constructor(private dom: LightboxDOM, private controller: LightboxController) {}

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

	async configure(animator: LightboxAnimation) {
		const video = this.dom.get('video')
		if (!video) return

		const embed = video.querySelector('video') as HTMLVideoElement | undefined,
			iframe = video.querySelector('iframe') as HTMLIFrameElement | undefined

		if (embed) this.handle.embed(embed)
		else if (iframe) this.handle.iframe(iframe)

		const image = this.dom.get('image')
		if (!image) return

		;(image as HTMLElement).style.maxHeight = `${(video as HTMLElement).offsetHeight}px`
		animator.fadeElement(video)

		await animator.waitForAnimationEnd(video)
		animator.fadeElement(image)

		await animator.waitForAnimationEnd(image)
		image.remove()
	}

	dispose() {
		if (this.instance) {
			try {
				this.instance.destroy()
			} catch (err) {}
		}
		this.instance = null
	}

	private handle = {
		embed: (embed: HTMLVideoElement) => {
			const source = embed.src ?? ''

			if (Hls.isSupported()) {
				this.instance = new Hls()

				this.instance.loadSource(source)
				this.instance.attachMedia(embed)
				embed.pause()
				;(window as any).hls = this.instance

			// hls.on(Hls.Events.MANIFEST_PARSED, () => {
			// 	const player = new Plyr(embed, plyrOptions)
			// 	embed.play()
			// })
			} else {
				new Plyr(embed)
				// const player = new Plyr(embed)
			}
		},
		iframe: (iframe: HTMLIFrameElement) => {}
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

				value = { ...value, target, text }
			}

			return [direction, value] as const
		}))

		this.navigation = Object.fromEntries(entries) as ArrowsGroup

		return this.navigation
	}

	async setArrows(
		index: number,
		onNavigate: (direction: keyof NavigationOptions) => void
	) {
		await this.createMenu(index)
		const menu = this.dom.get('navigation')
		if (!menu || !Object.keys(this.navigation).length) return

		const directions = Object.keys(this.navigation) as (keyof NavigationOptions)[]

		directions.forEach((direction, i) => {
			const arrow = menu.querySelector(`.lightbox__arrow--${direction}`),
				item = (this.navigation as NavigationOptions)[direction]

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
				arrow?.remove()
			}
		})
	}

	async swapContent(
		direction: keyof NavigationOptions,
		animator: LightboxAnimation,
		media: LightboxMedia
	) {
		const item = (this.navigation as any)[direction]
		if (!Object.hasOwn(item, 'target')) return

		try {
			const { index, target } = item
			const newContent = await this.contentService.loadBlockContent(target)

			// this.dom.setState('change')
			animator.fadeBlocks(false)
			media.dispose()

			await new Promise(res => setTimeout(res, 50))
			this.dom.update(newContent)

			await this.createMenu(index)
			media.configure(animator)
			animator.fadeBlocks(true)
			// this.dom.setState('open')
		} catch (err) {
			console.error('lightbox swap failed', err)
		}
	}
}

export class LightboxController {
	private dom: LightboxDOM
	private animator: LightboxAnimation
	private events: LightboxEvents
	private media: LightboxMedia
	private navigator: LightboxNavigation

	private isActive: boolean = false

	constructor(private options: LightboxOptions) {
		this.dom = new LightboxDOM(options)
		this.animator = new LightboxAnimation(this.dom)
		this.navigator = new LightboxNavigation(this.dom, options, new ContentService())
		this.media = new LightboxMedia(this.dom)
		this.events = new LightboxEvents(this.dom, this)

		this.dom.append()
		this.events.bind()
		this.setInitialArrows()
	}

	private async setInitialArrows() {
		await this.navigator.setArrows(this.options.index, (dir) => this.navigate(dir))
	}

	private async navigate(direction: keyof NavigationOptions) {
		if (!this.isActive) return
		await this.navigator.swapContent(direction, this.animator, this.media)
		// await this.navigator.setArrows(
		// 	this.options.index,
		// 	this.navigator.swapContent(this.direction, this.animator, this.media)
		// )

		// await this.navigator.setArrows(this.options.index, (direction: 'next' | 'prev') => this.navigate(direction))
		// await this.navigator.swapContent(direction, this.animator, this.media)
	}

	async open() {
		if (this.isActive) return
		this.isActive = true

		this.dom.setState('open')
		this.animator.fadeInRoot()
		this.media.configure(this.animator)
		this.animator.fadeBlocks(true)

		// await this.animator.waitForAnimationEnd(Array.from(this.dom.get('blocks')!).at(-1))
		this.animator.fadeArrows(true, this.navigator.getPointers(this.options.index))

		await this.animator.waitForAnimationEnd(this.dom.get('navigation'))

		this.dom.setProperties({ 'data-disabled': 'false' })
	}

	async close() {
		if (!this.isActive) return
		this.isActive = false

		this.dom.setState('close')
		this.animator.fadeOutRoot()
		// this.animator.fadeBlocks(false)

		await this.animator.waitForAnimationEnd(this.dom.get('overlay'))

		this.events.unbind()
		this.media.dispose()
		this.dom.remove()
	}

	toggle() {
		this.isActive ? this.close() : this.open()
	}
}

