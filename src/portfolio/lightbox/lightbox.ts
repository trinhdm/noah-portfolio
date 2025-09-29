import Hls from 'hls.js'
import Plyr from 'plyr'
import template from './template'
import type { LightboxOptions, NavigationOptions } from './lightbox.types'
import { resetBlock, setAnimation } from '../../utils/css'


export class Lightbox {
	private activeClass: string = 'lightbox--active'
	// private classList: DOMTokenList
	private isActive: boolean = false
	private lightbox: HTMLElement
	private navigation: NavigationOptions | {} = {}


	constructor({
		content,
		navigation = {},
		properties = {}
	}: LightboxOptions) {
		this.lightbox = this.create(properties)
		// this.classList = this.lightbox?.classList

		this.navigation = navigation

		const container = this.lightbox.querySelector('.lightbox__content')

		if (container && content)
			container.innerHTML = content.innerHTML

		this.navigate()
		// this.style()
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

		// const delay = this.calculate(container)
		// overlay.style.animationDelay = `${delay}s`

		const onStyleBlocks = () => {
			this.style()
			container.removeEventListener('animationend', onStyleBlocks as EventListener)
		}

		container.addEventListener('animationend', onStyleBlocks as EventListener, { once: true })
	}

	public close(): void {
		const { blocks, overlay, video } = this.structure()

		if (!this.isActive || !video) return

		this.isActive = false
		this.lightbox?.classList.remove(this.activeClass)
		this.style()

		const onAnimateOverlay = () => {
			blocks.forEach(block => block.classList.remove('lightbox--animated'))

			setTimeout(() => this.reset(), 5)

			video.removeEventListener('animationend', onAnimateOverlay as EventListener)
		}

		video?.addEventListener('animationend', onAnimateOverlay as EventListener, { once: true })

		overlay?.addEventListener('animationend', () => {
			console.log('fired')
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

		if (!directions.length) return

		const setArrow = async (direction: 'next' | 'prev', i: number) => {
			const arrow = menu?.querySelector(`.lightbox__arrow--${direction}`),
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

		directions.forEach((direction, i) => setArrow(direction, i))
	}

	private style(): void {
		const { blocks, image, video } = this.structure()

		if (image && video) {
			image.style.maxHeight = `${video.offsetHeight}px`
		}
		else if (video) {
			this.reset(video)
		}

		const textBlocks = [...blocks].filter(block => block.classList.contains('lightbox__html'))

		if (textBlocks?.length) {
			textBlocks.forEach((block, i) => {
				const base = {
					duration: .725,
					index: i,
					stagger: .325,
				}

				console.log({ a: this.isActive })

				const args = this.isActive
					? { ...base, start: 1 }
					: { ...base, start: 0 }

				Object.assign(block.style, setAnimation(args))

				this.reset(block)

				// resetBlock({ block, className: 'lightbox--animated' })
			})
		}

		// blocks.forEach(block => this.reset(block))
	}


	//	events
	//	-------------------------

	private animate(): void {
		const { image, video } = this.structure()

		if (!image || !video) return

		let media: HTMLIFrameElement | HTMLVideoElement | null = video.querySelector('video')

		let config = {
			autoplay: () => (media as HTMLVideoElement)?.play(),
			event: 'loadeddata',
		} as {
			autoplay: () => void
			event: string
		}

		if (video.contains(media)) {
			this.embed(video)
		} else {
			media = video.querySelector('iframe') as HTMLIFrameElement

			config = {
				autoplay: () => {
					if (!media) return
					media.src = `${media.src}&autoplay=1&origin`
				},
				event: 'load',
			}
		}

		media?.addEventListener(config.event, () => {
			this.reset(video)
		}, { once: true })

		video.addEventListener('animationend', (event: AnimationEvent) => {
			event.stopPropagation()

			this.reset(image)
			console.log('RESET IMG')

			image.addEventListener('animationstart', () => {
				config.autoplay()
				console.log('AUTOPLAY')

				image.addEventListener('animationend', () => {
					console.log('NESTED')
					image.remove()

					// blocks.forEach(block => block.classList.remove('lightbox--animated'))

					// setTimeout(() => {
					// 	console.log('REMOVED')
					// 	image.remove()
					// }, 2000)
				}, { once: true })
			}, { once: true })
		}, { once: true })
	}

	private click(): void {
		const { closeBtn, overlay } = this.structure()

		closeBtn!.onclick = () => this.close()
		overlay!.onclick = () => this.close()
	}

	private bind(): void {
		this.animate()
		this.click()
	}


	private calculate(element: HTMLElement | null): number {
		let time = 0

		if (element) {
			const {
				animationDelay: delay,
				animationDuration: duration,
			} = window.getComputedStyle(element)

			time = .5 * (parseFloat(duration) + parseFloat(delay))
		}

		return time
	}
}
