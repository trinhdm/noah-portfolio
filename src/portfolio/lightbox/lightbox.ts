import template from './template'
import type {
	ArrowsGroup,
	CreateGroup,
	SetupGroup,
} from './lightbox.types'


export class Lightbox {
	private activeClass: string = 'lightbox--active'
	private classList: DOMTokenList
	private index: number = 0
	private isActive: boolean = false
	private lightbox: HTMLElement
	private navigation: ArrowsGroup | {} = {}


	constructor({
		content,
		index,
		navigation = {},
		properties = {}
	}: SetupGroup) {
		this.lightbox = this.create(properties)
		this.classList = this.lightbox?.classList

		this.index = index
		this.navigation = navigation

		const contentEl = this.lightbox.querySelector('.lightbox__content')

		if (contentEl)
			contentEl.innerHTML = content

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

	private reset(): void {
		const animationClass = 'lightbox--animated'

		this.classList.remove(animationClass)
		void this.lightbox?.offsetHeight
		this.classList.add(animationClass)
		console.log('reset')
	}

	private create(properties: CreateGroup): HTMLElement {
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

	private bind(): void {
		const closeBtn: HTMLElement = this.lightbox.querySelector('.lightbox__close')!,
			overlay: HTMLElement = this.lightbox.querySelector('.lightbox__overlay')!

		closeBtn.onclick = () => this.close()
		overlay.onclick = () => this.close()

		const image = this.lightbox.querySelector('.lightbox__image'),
			video = this.lightbox.querySelector('.lightbox__video'),
			iframe = video?.querySelector('iframe')

		if (!image || !iframe) return

		const onAnimateImage = (event: AnimationEvent) => {
			event.preventDefault()
			event.stopPropagation()

			setTimeout(() => {
				image.remove()
				// iframe.src = `${iframe.src}&autoplay=1&origin`
			}, 100)

			image.removeEventListener('animationend', onAnimateImage as EventListener)
		}

		image.addEventListener('animationend', onAnimateImage as EventListener)
	}


	private navigate(): void {
		const directions = (Object.keys(this.navigation) as (keyof ArrowsGroup)[])

		if (!directions.length) return

		const setArrow = (direction: 'next' | 'prev', i: number) => {
			const navigation = this.lightbox.querySelector('.lightbox__navigation'),
				arrow = navigation?.querySelector(`.lightbox__arrow--${direction}`),
				text = (this.navigation as ArrowsGroup)[`${direction}`]

			if (arrow && text) {
				let j
				const item = document.createElement('span')
				item.textContent = text

				if (i % 2 === 0) {
					arrow.prepend(item)
					j = this.index - 1
				}
				else {
					arrow.append(item)
					j = this.index + 1
				}

				arrow.setAttribute('data-position', `${j}`)
			} else {
				arrow?.remove()
			}
		}

		directions.forEach((direction, i) => setArrow(direction, i))
	}
}
