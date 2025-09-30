import Hls from 'hls.js'
import Plyr from 'plyr'
import template from './template'
import { setAnimation } from '../../utils/css'
import type { LightboxOptions, NavigationOptions } from './lightbox.types'


export class Lightbox {
	private activeClass: string = 'lightbox--active'
	private isActive: boolean = false
	private lightbox: HTMLElement
	private navigation: NavigationOptions | {} = {}


	constructor({
		content,
		navigation = {},
		properties = {}
	}: LightboxOptions) {
		this.lightbox = this.create(properties)
		this.navigation = navigation

		const container = this.lightbox.querySelector('.lightbox__content')

		if (container && content)
			container.innerHTML = content.innerHTML

		this.navigate()
		this.bind()
	}


	//	-------------------------
	//	external methods
	//	-------------------------

	public open(): void {
		const { container } = this.structure()

		if (this.isActive || !container) return

		this.isActive = true
		this.lightbox?.classList.add(this.activeClass)

		this.reset()
		document.body.style.overflow = 'hidden'
		document.body.appendChild(this.lightbox)

		const onBlockStyle = () => this.style()
		container?.addEventListener('animationstart', onBlockStyle, { once: true })
	}

	public close(): void {
		const { blocks, overlay, video } = this.structure()

		if (!this.isActive || !video) return

		this.isActive = false
		this.lightbox?.classList.remove(this.activeClass)
		this.style()

		const animateBlocksLB = () => {
			console.log('test')
			blocks.forEach(block => block.classList.remove('lightbox--animated'))
			// setTimeout(() => this.reset(), 10)
		}

		const onAnimateOverlay = () => {
			console.log('test123')
			this.lightbox.remove()
			document.body.style.overflow = 'auto'
		}

		video?.addEventListener('animationend', animateBlocksLB, { once: true })
		overlay?.addEventListener('animationend', onAnimateOverlay, { once: true })
	}

	public toggle(): void {
		this.isActive ? this.close() : this.open()
	}


	//	-------------------------
	//	internal methods
	//	-------------------------


	//	elements
	//	-------------------------

	private reset(element: HTMLElement | null = this.lightbox): void {
		if (!element) return

		const animationClass = 'lightbox--animated',
			classList = element.classList

		classList.remove(animationClass)
		void element.offsetHeight
		classList.add(animationClass)

	}

	private create(
		properties: LightboxOptions['properties']
	): HTMLElement {
		const lightbox = document.createElement('div')

		lightbox.className = 'lightbox'
		lightbox.innerHTML = template.trim()

		const props = Object.entries(properties)

		if (!!props?.length) {
			const ignoreProps = [
				'innerHTML',
				'innerText',
				'outerHTML',
				'textContent',
			]

			props.forEach(([prop, value]) => {
				if (!ignoreProps.includes(prop))
					(lightbox as any)[`${prop}`] = value
			})
		}

		return lightbox
	}

	private structure(
		lightbox: HTMLElement | null = this.lightbox
	) {
		const uniqueElements = {
			body: lightbox?.querySelector('.lightbox__body'),
			closeBtn: lightbox?.querySelector('.lightbox__close'),
			container: lightbox?.querySelector('.lightbox__container'),
			content: lightbox?.querySelector('.lightbox__content'),
			image: lightbox?.querySelector('.lightbox__image'),
			lightbox,
			menu: lightbox?.querySelector('.lightbox__navigation'),
			overlay: lightbox?.querySelector('.lightbox__overlay'),
			video: lightbox?.querySelector('.lightbox__video'),
		} as Record<string, HTMLElement | null>

		const elements = {
			...uniqueElements,
			blocks: lightbox?.querySelectorAll('.fe-block') as NodeListOf<HTMLElement>,
		}

		return elements as typeof elements & typeof uniqueElements
	}

	private embed(element: Element = this.lightbox): void {
		const video = element?.querySelector('video')

		if (!video) return

		const source = video.src ?? ''

		if (Hls && Hls?.isSupported()) {
			const hls = new Hls()

			hls.loadSource(source)
			hls.attachMedia(video)
			video.pause()
			window.hls = hls

			// hls.on(Hls.Events.MANIFEST_PARSED, () => {
			// 	const player = new Plyr(video, plyrOptions)
			// 	video.play()
			// })
		} else {
			const player = new Plyr(video)
		}
	}

	private navigate(): void {
		const { menu } = this.structure(),
			directions = Object.keys(this.navigation) as (keyof NavigationOptions)[]

		if (!directions.length || !menu) return

		const setArrow = async (direction: 'next' | 'prev', i: number) => {
			const arrow = menu.querySelector(`.lightbox__arrow--${direction}`),
				{ index, text } = (this.navigation as NavigationOptions)[`${direction}`]

			if (arrow && text) {
				if (i % 2 === 0)
					arrow.prepend(text)
				else
					arrow.append(text)

				arrow.setAttribute('data-position', `${index}`)
			} else {
				arrow?.remove()
			}
		}

		directions.forEach((direction, i) => {
			setArrow(direction, i)

			const arrow = menu.querySelector(`.lightbox__arrow--${direction}`)

			arrow?.addEventListener('click', async event => {
				event.preventDefault()

				console.log('is open')
			})
		})

		// console.log({ directions: this.navigation })
	}

	private style(): void {
		const { blocks, image, video } = this.structure()

		if (image && video) {
			image.style.maxHeight = `${video.offsetHeight}px`
		} else if (!this.isActive && (!image && video)) {
			this.reset(video)
		}

		const textBlocks = [...blocks].filter(block => block.classList.contains('lightbox__html'))

		textBlocks?.forEach((block, i) => {
			const startTime = this.isActive ? .75 : 0

			const args = {
				duration: .5,
				index: i,
				stagger: .25,
				start: startTime
			}

			Object.assign(block.style, setAnimation(args))
			this.reset(block)
		})
	}


	//	events
	//	-------------------------

	private animate(): void {
		const { image, video } = this.structure()

		if (!image || !video) return

		let event = '',
			media: HTMLIFrameElement | HTMLVideoElement | null = video.querySelector('video')

		if (video.contains(media)) {
			this.embed(video)
			event = 'loadeddata'
		} else {
			media = video.querySelector('iframe') as HTMLIFrameElement
			event = 'load'
		}

		media?.addEventListener(event, () => {
			this.reset(video)
			console.log('ON LOAD')

			video.addEventListener('animationend', () => {
				// event.stopPropagation()
				this.reset(image)
				console.log('ON VIDEO END')

				image.addEventListener('animationstart', () => {
					if (media instanceof HTMLVideoElement)
						(media as HTMLVideoElement)?.play()
					else
						media.src = `${media.src}&autoplay=1&origin`


					console.log('ON IMG START')
				}, { once: true })

				image.addEventListener('animationend', () => {
					setTimeout(() => image.remove(), 100)

					console.log('ON IMG END')
				}, { once: true })

			}, { once: true })
		}, { once: true })
	}

	private click(): void {
		const { closeBtn, menu, overlay } = this.structure()

		closeBtn!.onclick = () => this.close()
		overlay!.onclick = () => this.close()

		;(menu?.querySelectorAll('.lightbox__arrow') as NodeListOf<HTMLElement>).forEach(arrow => {
			let direction: 'next' | 'prev' | '' = ''

			if (arrow.classList.contains('next'))
				direction = 'next'

			else if (arrow.classList.contains('prev'))
				direction = 'prev'

			arrow.onclick = () => {
				this.close()

				console.log('test', direction, this.navigation)

				// if (!!direction && Object.keys(this.navigation).length) {
				// 	const key = direction as keyof typeof this.navigation
				// 	const { lightbox } = (this.navigation)[`${key}`]

				// 	console.log({ lightbox })
				// 	// const newLightbox = new Lightbox(lightbox)

				// 	// newLightbox?.open()
				// }

			}
		})
	}

	private bind(): void {
		this.animate()
		this.click()
	}
}
