import Hls from 'hls.js'
import Plyr from 'plyr'
import template from './template'
import type { LightboxOptions, NavigationOptions } from './lightbox.types'


export class Lightbox {
	private activeClass: string = 'lightbox--active'
	private classList: DOMTokenList
	private isActive: boolean = false
	private lightbox: HTMLElement
	private navigation: NavigationOptions | {} = {}


	constructor({
		content,
		navigation = {},
		properties = {}
	}: LightboxOptions) {
		this.lightbox = this.create(properties)
		this.classList = this.lightbox?.classList

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
		if (this.isActive) return

		this.isActive = true
		this.reset()
		this.classList.add(this.activeClass)

		document.body.style.overflow = 'hidden'
		document.body.appendChild(this.lightbox)

		console.log('OPEN')
	}

	public close(): void {
		const overlay = this.lightbox.querySelector('.lightbox__overlay')

		if (!this.isActive || !overlay) return

		this.isActive = false
		this.reset()

		const onAnimateOverlay = (event: AnimationEvent) => {
			event.preventDefault()
			event.stopPropagation()

			this.classList.remove(this.activeClass)
			document.body.style.overflow = 'auto'

			setTimeout(() => this.lightbox.remove(), 800)

			console.log('CLOSE')

			overlay.removeEventListener('animationend', onAnimateOverlay as EventListener)
		}

		overlay.addEventListener('animationend', onAnimateOverlay as EventListener)
	}

	public toggle(): void {
		this.isActive ? this.close() : this.open()
	}


	//	-------------------------
	//	internal methods
	//	-------------------------


	//	elements
	//	-------------------------

	private reset(): void {
		const animationClass = 'lightbox--animated'

		this.classList.remove(animationClass)
		void this.lightbox?.offsetHeight
		this.classList.add(animationClass)
		console.log('reset')
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

	private embed(element: Element = this.lightbox): void {
		const video = element?.querySelector('video')

		if (!video) return

		const source = video.src ?? ''

		if (Hls && Hls?.isSupported()) {
			const hls = new Hls()

			hls.loadSource(source)
			hls.attachMedia(video)
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
		const container = this.lightbox.querySelector('.lightbox__navigation'),
			directions = Object.keys(this.navigation) as (keyof NavigationOptions)[]

		if (!directions.length) return

		const setArrow = async (direction: 'next' | 'prev', i: number) => {
			const arrow = container?.querySelector(`.lightbox__arrow--${direction}`),
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


	//	events
	//	-------------------------

	private animate(): void {
		const image: HTMLElement | null = this.lightbox.querySelector('.lightbox__image'),
			video: HTMLElement | null = this.lightbox.querySelector('.lightbox__video')

		if (!image || !video) return

		const onStartAnimation = (event: AnimationEvent) => {
			event.preventDefault()
			event.stopPropagation()

			image.style.maxHeight = `${video.offsetHeight}px`

			video.removeEventListener('animationstart', onStartAnimation as EventListener)
		}

		const onEndAnimation = (event: AnimationEvent) => {
			event.preventDefault()
			event.stopPropagation()

			const iframe = video.querySelector('iframe'),
				time = !!iframe ? 100 : 150

			setTimeout(() => {
				image.remove()
				this.embed(video)
				// iframe.src = `${iframe.src}&autoplay=1&origin`
			}, time)

			image.removeEventListener('animationend', onEndAnimation as EventListener)
		}

		video.addEventListener('animationstart', onStartAnimation as EventListener)
		image.addEventListener('animationend', onEndAnimation as EventListener)
	}

	private click(): void {
		const closeBtn: HTMLElement = this.lightbox.querySelector('.lightbox__close')!,
			overlay: HTMLElement = this.lightbox.querySelector('.lightbox__overlay')!

		closeBtn.onclick = () => this.close()
		overlay.onclick = () => this.close()
	}

	private bind(): void {
		this.animate()
		this.click()
	}
}
