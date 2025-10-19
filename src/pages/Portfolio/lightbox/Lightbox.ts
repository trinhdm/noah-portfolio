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

		document.body.appendChild(this.lightbox)
	}


	//	-------------------------
	//	external methods
	//	-------------------------

	public open(): void {
		if (this.isActive) return

		this.isActive = true
		this.lightbox.classList.add(this.activeClass)
		this.html.reset()
		document.body.style.overflow = 'hidden'

		const { body, container, image, video } = this.html.get()
		console.log('OPEN')

		container?.addEventListener('animationstart', () => {
			console.log('	CONTAINERR START')

			if (image && video) {
				(image as HTMLElement).style.maxHeight = `${(video as HTMLElement).offsetHeight}px`
			} else if (!this.isActive && video) {
				this.html.reset(video as HTMLElement)
				console.log('	reset? idk what this does')
			}

			this.animate.htmlBlocks(true)
			this.animate.media()
		}, { once: true, passive: true })

		body?.addEventListener('animationend', () => {
			setTimeout(() => this.lightbox.classList.remove('lightbox--disabled'), 500)
		}, { once: true, passive: true })
	}

	public close(): void {
		if (!this.isActive) return

		this.isActive = false
		this.lightbox.classList.add('lightbox--disabled')
		console.log('CLOSED')

		setTimeout(() => {
			this.lightbox.classList.remove(this.activeClass)
			this.html.reset()
			this.animate.htmlBlocks(false)
			this.html.reset(video as HTMLVideoElement)
		}, 50)

		const { blocks, overlay, video } = this.html.get()

		video?.addEventListener('animationstart', () => {
			console.log('	closed video')
			blocks.forEach(block => block.classList.remove('lightbox--animated'))
		}, { once: true })

		overlay?.addEventListener('animationend', () => {
			console.log('	closed overlay')
			this.lightbox.remove()
			document.body.style.overflow = 'auto'
		}, { once: true })
	}

	private animate = {
		htmlBlocks: (isActive: boolean): void => {
			const { blocks } = this.html.get()

			;[...blocks].filter(block => block.classList.contains('lightbox__html')).forEach((htmlBlock, index) => {
				Object.assign(htmlBlock.style, setAnimation({
					duration: .45,
					index,
					stagger: .125,
					start: isActive ? .75 : 0,
				}))

				this.html.reset(htmlBlock)
			})
		},

		media: (): void => {
			const { image, video } = this.html.get()
			if (!image || !video) return

			let eventName: string = 'loadeddata',
				media: HTMLIFrameElement | HTMLVideoElement | null = video.querySelector('video')

			console.log('MEDIA')

			if (video.contains(media)) {
				this.components.embed(video)
			} else {
				media = video.querySelector('iframe') as HTMLIFrameElement
				eventName = 'load'
			}

			media?.addEventListener(eventName, () => {
				setTimeout(() => {
					this.html.reset(video as HTMLVideoElement)
				}, 50)

				console.log('	ANIMATE MEDIA', this.isActive, media)


				;(video as HTMLVideoElement).addEventListener('animationend', (event: AnimationEvent) => {
					event.stopPropagation()
					this.html.reset(image)
					console.log('	FADE MEDIA IN', this.isActive, event)

					image.addEventListener('animationstart', () => {
						if (media instanceof HTMLVideoElement)
							(media as HTMLVideoElement)?.play()
						// else if (!!media.src)
						// 	media.src = `${media.src}&autoplay=1&mute=1`
					})

					image.addEventListener('animationend', () => {
						setTimeout(() => image.remove(), 100)
					}, { once: true })
				}, { once: true })
			}, { once: true })
		},
	}

	// public refresh(): void {
	// 	const { blocks, overlay, video } = this.html.get()
	// 	console.log('REFRESH')

	// 	this.lightbox.classList.add('lightbox--disabled')
	// 	this.lightbox.classList.remove(this.activeClass)
	// 	this.animate.htmlBlocks()
	// }

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

			// replace the content inside the lightbox
			const { body, content } = this.html.get()

			if (!nav?.target || !content) return

			try {
				const newContent = await setContent({ block: nav.target, page: getPage(nav.target) })

				this.animate.htmlBlocks(false)
					console.log('replace content')

				body?.addEventListener('animationend', () => {
					console.log('firrst')

					content.innerHTML = newContent?.innerHTML ?? ''
					this.animate.htmlBlocks(true)
				}, { once: true })

				// update index + navigation
				this.navigation = this.set.pointers(nav.index)

				// re-bind arrows + embed logic
				this.components.arrows()
				this.events.bind()
			} catch (err) {
				console.log('didnt swap', err)
			}
		},

		reset: (element: HTMLElement | null = this.lightbox): void => {
			if (!element) return
			const cls = 'lightbox--animated'
			element.classList.remove(cls)
			void element.offsetHeight		// trigger reflow
			element.classList.add(cls)
			console.log('FIRED', element)
		},

		get: (lightbox: HTMLElement | null = this.lightbox) => {
			let structure = {
				blocks: lightbox?.querySelectorAll('.fe-block') as NodeListOf<HTMLElement>,
				body: lightbox?.querySelector('.lightbox__body'),
				closeBtn: lightbox?.querySelector('.lightbox__close'),
				container: lightbox?.querySelector('.lightbox__container'),
				content: lightbox?.querySelector('.lightbox__content'),
				image: lightbox?.querySelector('.lightbox__image') as HTMLImageElement | null,
				lightbox,
				menu: lightbox?.querySelector('.lightbox__navigation'),
				overlay: lightbox?.querySelector('.lightbox__overlay'),
				video: lightbox?.querySelector('.lightbox__video'),
			}

			const { image, video } = structure

			if (image && video) {
				let media: HTMLIFrameElement | HTMLVideoElement | null = video.querySelector('video')

				if (!video.contains(media))
					media = video.querySelector('iframe') as HTMLIFrameElement

				structure = { ...structure, media } as typeof structure & { media: HTMLIFrameElement | HTMLVideoElement | null }
			}

			return structure
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

			const { menu } = this.html.get()
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
			// this.events.animate()
			this.events.click()
		},

		// animate: (): void => {
		// 	const { image, video } = this.html.get()
		// 	if (!image || !video) return

		// 	let eventName: string = 'loadeddata',
		// 		media: HTMLIFrameElement | HTMLVideoElement | null = video.querySelector('video')

		// 	console.log('MEDIA')

		// 	if (video.contains(media)) {
		// 		this.components.embed(video)
		// 	} else {
		// 		media = video.querySelector('iframe') as HTMLIFrameElement
		// 		eventName = 'load'
		// 	}

		// 	media?.addEventListener(eventName, () => {
		// 		setTimeout(() => {
		// 			this.html.reset(video as HTMLVideoElement)
		// 		}, 50)

		// 		console.log('	ANIMATE MEDIA', this.isActive, media)


		// 		;(video as HTMLVideoElement).addEventListener('animationend', (event: AnimationEvent) => {
		// 			if (!this.isActive) return

		// 			event.stopPropagation()
		// 			this.html.reset(image)
		// 			console.log('	FADE MEDIA IN', this.isActive, event)

		// 			image.addEventListener('animationstart', () => {
		// 				if (media instanceof HTMLVideoElement)
		// 					(media as HTMLVideoElement)?.play()
		// 				else if (!!media.src)
		// 					media.src = `${media.src}&autoplay=1&mute=1`
		// 			})

		// 			image.addEventListener('animationend', () => {
		// 				setTimeout(() => image.remove(), 100)
		// 			}, { once: true })
		// 		})
		// 	})
		// },

		click: (): void => {
			const { closeBtn, overlay } = this.html.get()

			;(closeBtn! as HTMLElement).onclick = () => this.close()
			;(overlay! as HTMLElement).onclick = () => this.close()
		},
	}
}
