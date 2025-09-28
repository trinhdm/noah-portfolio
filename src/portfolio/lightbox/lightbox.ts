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
		const navEl = this.lightbox.querySelector('.lightbox__navigation'),
			next = navEl?.querySelector('.lightbox__arrow--right'),
			prev = navEl?.querySelector('.lightbox__arrow--left')

		if (!Object.keys(this.navigation).length) return
		const navItems = this.navigation as ArrowsGroup

		console.log(typeof navItems.next === 'string' && !(navItems.next instanceof HTMLElement))

		if (!!next) {
			if (!!navItems.next) {
				next.prepend(navItems.next)
				next.setAttribute('data-position', `${this.index + 1}`)
			} else {
				next.remove()
			}
		}

		if (!!prev) {
			if (!!navItems.prev) {
				prev.append(navItems.prev)
				prev.setAttribute('data-position', `${this.index - 1}`)
			} else {
				prev.remove()
			}
		}
	}
}
