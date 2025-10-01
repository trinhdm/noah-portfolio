import Hls from 'hls.js'
import Plyr from 'plyr'
import template from './template'
import { setAnimation } from '../../utils/css'
import type { LightboxOptions, NavigationOptions } from './lightbox.types'


export class Lightbox {
	private activeClass: string = 'lightbox--active'
	private isActive: boolean = false
	private navigation: NavigationOptions | {} = {}

	public lightbox: HTMLElement


	constructor({
		content,
		navigation = {},
		properties = {}
	}: LightboxOptions) {
		this.lightbox = this.elements.create(properties)
		this.navigation = navigation

		const container = this.lightbox.querySelector('.lightbox__content')

		if (container && content)
			container.innerHTML = content.innerHTML

		this.navigate.create()
		this.events.bind()
	}


	//	-------------------------
	//	external methods
	//	-------------------------

	public open(): void {
		const { body, container } = this.elements.structure()

		if (this.isActive || !body || !container) return

		this.isActive = true
		this.lightbox.classList.add(this.activeClass)
		this.elements.reset()

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
		const { blocks, overlay, video } = this.elements.structure()
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

	public toggle(): void {
		this.isActive ? this.close() : this.open()
	}


	//	-------------------------
	//	internal methods
	//	-------------------------


	//	elements
	//	-------------------------

	private elements = {
		create: (properties: LightboxOptions['properties']): HTMLElement => {
			const lightbox = document.createElement('div')
			lightbox.classList.add('lightbox', 'lightbox--disabled')
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

			return lightbox
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

	private media = {
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
	}

	private navigate = {
		create: (): void => {
			const { menu } = this.elements.structure()
			const directions = Object.keys(this.navigation) as (keyof NavigationOptions)[]

			if (!directions.length || !menu) return

			directions.forEach((direction, i) => {
				const arrow = menu.querySelector(`.lightbox__arrow--${direction}`)
				const {
					index,
					// target: { id, url },
					text,
				} = (this.navigation as NavigationOptions)[direction]

				if (arrow && text) {
					i % 2 === 0
						? arrow.prepend(text)
						: arrow.append(text)

					arrow.setAttribute('data-position', `${index}`)
					// arrow.setAttribute('data-id', `${id}`)
					// arrow.setAttribute('data-url', `${url}`)
				} else {
					arrow?.remove()
				}
			})
		},
	}

	private style = {
		apply: (): void => {
			const { blocks, image, video } = this.elements.structure()

			if (image && video) {
				(image as HTMLElement).style.maxHeight = `${(video as HTMLElement).offsetHeight}px`
			} else if (!this.isActive && video) {
				this.elements.reset(video as HTMLElement)
				console.log('reset')
			}

			;[...blocks].filter(b => b.classList.contains('lightbox__html')).forEach((block, i) => {
				Object.assign(block.style, setAnimation({
					duration: .45,
					index: i,
					stagger: .125,
					start: this.isActive ? .75 : 0,
				}))

				this.elements.reset(block)
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
			const { image, video } = this.elements.structure()
			if (!image || !video) return

			let media: HTMLIFrameElement | HTMLVideoElement | null = video.querySelector('video')
			let event: string = 'loadeddata'

			if (!video.contains(media)) {
				media = video.querySelector('iframe') as HTMLIFrameElement
				event = 'load'
			} else {
				this.media.embed(video)
			}

			media?.addEventListener(event, () => {
				setTimeout(() => {
					this.elements.reset(video as HTMLVideoElement)
				}, 250)

				video.addEventListener('animationend', () => {
					this.elements.reset(image as HTMLElement)

					image.addEventListener('animationstart', () => {
						if (media instanceof HTMLVideoElement)
							(media as HTMLVideoElement)?.play()
						else
							media.src = `${media.src}&autoplay=1&origin`
					})

					image.addEventListener('animationend', () => {
						setTimeout(() => image.remove(), 100)
					}, { once: true })
				})
			})
		},

		click: (): void => {
			const { closeBtn, overlay } = this.elements.structure()

			;(closeBtn! as HTMLElement).onclick = () => this.close()
			;(overlay! as HTMLElement).onclick = () => this.close()

			// const arrow = (this.lightbox.querySelector('.lightbox__arrow')! as HTMLElement)

			// arrow.onclick = () => {
			// 	console.log('ARROW')
			// 	const position = arrow.dataset.position as `${number}` | undefined

			// 	if (position) {
			// 		const nextIndex = parseInt(position),
			// 			[nextBlock] = [...blocks].filter(block => parseInt(`${block.dataset.position}`) === nextIndex)

			// 		const nextBlockContent = await Block.init({
			// 			className,
			// 			index: nextIndex,
			// 			target: nextBlock,
			// 		})

			// 		console.log({ nextBlockContent, lightboxEl })
			// 		createLightbox(nextBlockContent)

			// 		lightboxEl?.querySelector('.lightbox__overlay')?.addEventListener('animationend', () => {
			// 			console.log('test')
			// 			// createLightbox(nextBlockContent)
			// 		})
			// 	}
			// }
		},

		// arrows: (): void => {
		// 	const arrows = this.lightbox.querySelectorAll('.lightbox__arrow')
		// 	arrows.forEach(arrow => arrow.addEventListener('click', e => {
		// 		e.preventDefault()
		// 		console.log('arrow click:', (arrow as HTMLElement).dataset.position)
		// 		this.close()
		// 	}))
		// },
	}
}
