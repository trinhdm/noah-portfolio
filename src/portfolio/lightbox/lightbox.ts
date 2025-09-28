import template from './template'
import type {
	ArrowsGroup,
	CreateGroup,
	NavigateGroup,
	ResetGroup,
	SetupGroup,
	ToggleGroup
} from './lightbox.types'


//	creates lightbox for portfolio page
const createLightbox = (properties: CreateGroup = {}) => {
	const lightbox = document.createElement('div')

	lightbox.className = 'lightbox'
	lightbox.innerHTML = template.trim()

	const lbProps = Object.entries(properties)

	if (!!lbProps?.length) {
		const ignoreProps = [
			'innerHTML',
			'innerText',
			'outerHTML',
			'textContent',
		]

		lbProps.forEach(([prop, value]) => {
			if (!ignoreProps.includes(prop) )
				(lightbox as any)[`${prop}`] = value
		})
	}

	return lightbox
}


const setupLightbox = ({
	content,
	index,
	navigation = {},
	properties = {},
}: SetupGroup) => {
	const lightbox = lightboxActions.create(properties)
	lightbox.querySelector('.lightbox__content')!.innerHTML = content

	lightboxActions.navigate({ index, lightbox, navigation })
	lightboxActions.toggle({ lightbox })

	const lbImage = lightbox.querySelector('.lightbox__image') as HTMLElement,
		lbVideo = lightbox.querySelector('.lightbox__video') as HTMLElement

	lbImage.addEventListener('animationend', (evt: AnimationEvent) => {
		evt.preventDefault()
		evt.stopPropagation()

		const iframe = lbVideo?.querySelector('iframe')

		if (!lbVideo || !iframe) return

        const videoSrc = iframe.src
		lbImage.remove()

		setTimeout(() => {
            iframe.src = `${videoSrc}&autoplay=1&origin`
        }, 50)

		lbImage.removeEventListener('animationend', () => {})
	})

	return lightbox
}


const renderNavigation = ({ index, lightbox, navigation = {} }: NavigateGroup) => {
	const navEl = lightbox.querySelector('.lightbox__navigation'),
		next = navEl?.querySelector('.lightbox__arrow--right'),
		prev = navEl?.querySelector('.lightbox__arrow--left')

	if (!Object.keys(navigation).length) return
	const navItems = navigation as ArrowsGroup

	if (!!next) {
		if (!!navItems.next) {
			next.prepend(navItems.next)
			next.setAttribute('data-position', `${index + 1}`)
		} else {
			next.remove()
		}
	}

	if (!!prev) {
		if (!!navItems.prev) {
			prev.append(navItems.prev)
			prev.setAttribute('data-position', `${index - 1}`)
		} else {
			prev.remove()
		}
	}
}


const resetAnimations = ({
	activeClass = '',
	isActive = false,
	lightbox,
}: ResetGroup) => {
	const animationClass = 'lightbox--animated',
		lbClasses = lightbox?.classList

	if (lbClasses.contains(activeClass)) {
		lbClasses.remove(animationClass)
		lightbox?.offsetHeight
	}

	lbClasses.add(animationClass)

	if (isActive) {
		lbClasses.add(activeClass)
		document.body.style.overflow = 'hidden'
	} else {
		lbClasses.remove(activeClass)
		document.body.style.overflow = 'auto'
	}
}


const toggleLightbox = ({ lightbox }: ToggleGroup) => {
	const activeClass = 'lightbox--active',
		lbClasses = lightbox?.classList

	const lbCloseBtn = lightbox?.querySelector('.lightbox__close')! as HTMLElement,
		lbOverlay = lightbox?.querySelector('.lightbox__overlay')! as HTMLElement

	const resetArgs = { activeClass, lightbox }
	let hasExecuted = false

	const handleOpenLightbox = () =>  {
		if (lightbox && lbClasses.contains(activeClass)) return

		document.body.appendChild(lightbox)
		lightboxActions.reset({ isActive: true, ...resetArgs })
	}

	const handleCloseLightbox = (event: MouseEvent) => {
		event.preventDefault()
		event.stopPropagation()

		if (!lightbox || (lightbox && !lbClasses.contains(activeClass))) return

		lightboxActions.reset({ isActive: false, ...resetArgs })
		lbOverlay.addEventListener('animationend', (evt: AnimationEvent) => {
			evt.preventDefault()
			evt.stopPropagation()

			if (hasExecuted) return
			hasExecuted = true

			setTimeout(() => {
				lightbox.remove()

				if (!lightbox && hasExecuted)
					hasExecuted = false
			}, 800)

			lbOverlay.removeEventListener('animationend', () => {})
		})
	}

	handleOpenLightbox()

	lbCloseBtn.onclick = (event: MouseEvent) => handleCloseLightbox(event)
	lbOverlay.onclick = (event: MouseEvent) => handleCloseLightbox(event)
}


export const lightboxActions = {
	create: (properties: CreateGroup) => createLightbox(properties),
	navigate: (args: NavigateGroup) => renderNavigation(args),
	reset: (args: ResetGroup) => resetAnimations(args),
	setup: (args: SetupGroup) => setupLightbox(args),
	toggle: (args: ToggleGroup) => toggleLightbox(args),
}
