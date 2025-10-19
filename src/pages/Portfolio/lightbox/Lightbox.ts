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


type LightboxOptions<T extends HTMLElement = HTMLDivElement> = {
	content: HTMLDivElement | undefined
	elements: NodeListOf<HTMLElement>
	index: number
	page: PageGroup | undefined
	properties: Record<keyof T, T[keyof T]> | {};
}



//	1. click on block
//		a.	block returns `className`, `content`, `index`, `page`
//	2. create new lightbox element
//		a.	inject `block.content` into lightbox
//		b.	set video media from `block.content`
//		c.	create navigation
//		d.	set events


//	TODOs:
//		html.reset triggers animation bug on lightbox close + arrow click (content change)
//		add a `data-state` attr instead?
//			open, change, close


export class Lightbox {
	public lightbox: HTMLElement

	private activeClass: string = 'lightbox--active'
	private isActive: boolean = false

	private content: HTMLDivElement | undefined
	private elements: NodeListOf<HTMLElement>
	private navigation: ArrowsGroup

	constructor({
		content,
		elements,
		index,
		properties = {},
	}: LightboxOptions) {
		this.content = content
		this.elements = elements
		this.navigation = this.set.pointers(index)
		this.lightbox = this.html.create(properties)
		this.events.bind()
	}


	//	-------------------------
	//	external methods
	//	-------------------------

	public open(): void {
		const { body, container } = this.html.structure()

		if (this.isActive || !body || !container) return

		this.isActive = true
		this.lightbox.classList.add(this.activeClass)
		this.html.reset()

		console.log('OPEN')

		document.body.style.overflow = 'hidden'
		document.body.appendChild(this.lightbox)

		container.addEventListener('animationstart', () => {
			this.style.apply()
		}, { once: true, passive: true })

		body.addEventListener('animationend', () => {
			setTimeout(() => this.lightbox.classList.remove('lightbox--disabled'), 500)
		}, { once: true, passive: true })
	}

	public close(): void {
		const { blocks, overlay, video } = this.html.structure()
		console.log('CLOSED')

		if (!this.isActive || !video) return

		this.isActive = false
		this.lightbox.classList.add('lightbox--disabled')
		this.lightbox.classList.remove(this.activeClass)
		this.style.apply()

		video?.addEventListener('animationend', () => {
			console.log('test')
			blocks.forEach(block => block.classList.remove('lightbox--animated'))
		}, { once: true })

		overlay?.addEventListener('animationend', () => {
			console.log('test123')
			this.lightbox.remove()
			document.body.style.overflow = 'auto'
		}, { once: true })
	}

	public refresh(): void {
		const { blocks, overlay, video } = this.html.structure()
		console.log('REFRESH')

		this.lightbox.classList.add('lightbox--disabled')
		this.lightbox.classList.remove(this.activeClass)
		this.style.apply()
	}

	public toggle(): void {
		this.isActive ? this.close() : this.open()
	}

	//	elements
	//	-------------------------

	private set = {
		pointers: (index: number): ArrowsGroup => {
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
		},
		navigation: async () => {
			const directions = Object.keys(this.navigation) as (keyof ArrowsGroup)[]

			const entries = await Promise.all(
				directions.map(async (direction) => {
					const { target: rawTarget, ...rest } = this.navigation[direction]
					const target = findElement(rawTarget)
					let value = { ...rest, target }

					if (target) {
						const navWrapper = document.createElement('div'),
							newPage = getPage(target)

						navWrapper.innerHTML = await fetchContent(newPage) ?? ''

						const title = findChildBy(navWrapper, { tagName: 'strong' }),
							text = wrapTrimEl(title, 'span') ?? document.createElement('span')

						value = { ...value, target, text }
					}

					return [direction, value] as const
				})
			)

			return Object.fromEntries(entries) as ArrowsGroup
		}
	}

	private html = {
		create: (properties: LightboxOptions['properties']): HTMLElement => {
			const lightbox = document.createElement('div')

			lightbox.classList.add('lightbox', 'lightbox--disabled')
			// lightbox.id = `lightbox-${page?.id}`
			lightbox.innerHTML = template.trim()

			const ignore = [
				'innerHTML',
				'innerText',
				'outerHTML',
				'textContent',
			]

			Object.entries(properties).forEach(([prop, value]) => {
				if (!ignore.includes(prop))
					(lightbox as any)[prop] = value
			})

			const container = lightbox.querySelector('.lightbox__content')

			if (container && this.content)
				container.innerHTML = this.content.innerHTML

			this.components.arrows()

			return lightbox
		},

		swap: async (direction: keyof NavigationOptions): Promise<void> => {
			const nav = this.navigation[direction]
			if (!nav?.target) return

			// replace the content inside the lightbox
			const { content } = this.html.structure()

			if (content) {
				const newContent = await setContent({ block: nav.target, page: getPage(nav.target) })
				content.innerHTML = newContent?.innerHTML ?? ''
				this.style.apply()
			}

			// update index + navigation
			this.navigation = this.set.pointers(nav.index)

			// re-bind arrows + embed logic
			this.components.arrows()
			this.events.bind()
		},

		reset: (element: HTMLElement | null = this.lightbox): void => {
			if (!element) return
			const cls = 'lightbox--animated'
			element.classList.remove(cls)
			void element.offsetHeight		// trigger reflow
			element.classList.add(cls)
		},

		structure: (lightbox: HTMLElement | null = this.lightbox) => ({
			blocks: lightbox?.querySelectorAll('.fe-block') as NodeListOf<HTMLElement>,
			body: lightbox?.querySelector('.lightbox__body'),
			closeBtn: lightbox?.querySelector('.lightbox__close'),
			container: lightbox?.querySelector('.lightbox__container'),
			content: lightbox?.querySelector('.lightbox__content'),
			image: lightbox?.querySelector('.lightbox__image'),
			lightbox,
			menu: lightbox?.querySelector('.lightbox__navigation'),
			overlay: lightbox?.querySelector('.lightbox__overlay'),
			video: lightbox?.querySelector('.lightbox__video'),
		}),
	}

	private style = {
		apply: (): void => {
			const { blocks, image, video } = this.html.structure()

			if (image && video) {
				(image as HTMLElement).style.maxHeight = `${(video as HTMLElement).offsetHeight}px`
			} else if (!this.isActive && video) {
				this.html.reset(video as HTMLElement)
				console.log('reset')
			}

			;[...blocks].filter(b => b.classList.contains('lightbox__html')).forEach((block, i) => {
				Object.assign(block.style, setAnimation({
					duration: .45,
					index: i,
					stagger: .125,
					start: this.isActive ? .75 : 0,
				}))

				this.html.reset(block)
			})
		},
	}

	private components = {
		embed: (element: Element = this.lightbox): void => {
			const video = element.querySelector('video')
			if (!video) return

			const source = video.src ?? ''

			if (Hls.isSupported()) {
				const hls = new Hls()

				hls.loadSource(source)
				hls.attachMedia(video)
				video.pause()
				;(window as any).hls = hls

			// hls.on(Hls.Events.MANIFEST_PARSED, () => {
			// 	const player = new Plyr(video, plyrOptions)
			// 	video.play()
			// })
			} else {
				new Plyr(video)
				// const player = new Plyr(video)
			}
		},

		arrows: async (): Promise<void> => {
			this.navigation = await this.set.navigation()

			const { menu } = this.html.structure()
			const directions = Object.keys(this.navigation) as (keyof NavigationOptions)[]

			if (!directions.length || !menu) return

			directions.forEach((direction, i) => {
				const arrow: HTMLElement | null = menu.querySelector(`.lightbox__arrow--${direction}`)
				const nav = (this.navigation as NavigationOptions)[direction]

				if (arrow && nav?.text) {
					const [oldArrow] = [...arrow.children].filter(el => el.tagName.toLowerCase() === 'span')

					if (!!oldArrow)
						arrow.removeChild(oldArrow)

					i % 2 === 0
						? arrow.prepend(nav.text)
						: arrow.append(nav.text)

					arrow.setAttribute('data-position', `${nav.index}`)

					arrow.onclick = event => {
						event.preventDefault()
						console.log('nav click:', direction)

						// this.refresh()
						this.html.swap(direction)
					}
				} else {
					arrow?.remove()
					// delete this.navigation[direction]
				}
			})
		},
	}


	//	events
	//	-------------------------

	private events = {
		bind: (): void => {
			this.events.animate()
			this.events.click()
		},

		animate: (): void => {
			const { image, video } = this.html.structure()
			if (!image || !video) return

			let media: HTMLIFrameElement | HTMLVideoElement | null = video.querySelector('video')
			let event: string = 'loadeddata'

			if (!video.contains(media)) {
				media = video.querySelector('iframe') as HTMLIFrameElement
				event = 'load'
			} else {
				this.components.embed(video)
			}

			media?.addEventListener(event, () => {
				setTimeout(() => {
					this.html.reset(video as HTMLVideoElement)
				}, 50)

				video.addEventListener('animationend', () => {
					this.html.reset(image as HTMLElement)
					console.log('ANIMATE MEDIA')

					image.addEventListener('animationstart', () => {
						if (media instanceof HTMLVideoElement)
							(media as HTMLVideoElement)?.play()
						// else if (!!media.src)
						// 	media.src = `${media.src}&autoplay=1&mute=1`
					})

					image.addEventListener('animationend', () => {
						setTimeout(() => image.remove(), 100)
					}, { once: true })
				})
			})
		},

		click: (): void => {
			const { closeBtn, overlay } = this.html.structure()

			;(closeBtn! as HTMLElement).onclick = () => this.close()
			;(overlay! as HTMLElement).onclick = () => this.close()
		},
	}
}
