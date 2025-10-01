

import { setAnimation } from '../../utils/css'


export const handleHeader = () => {
	const headerNav = document.querySelector('.header-nav') as HTMLElement | null,
		navList = headerNav?.querySelector('.header-nav-list') as HTMLElement | null,
		navItems = headerNav?.querySelectorAll('.header-nav-item') as NodeListOf<HTMLElement>


	if (!headerNav || !navList) return

	headerNav.dataset.loading = 'true'

	headerNav.addEventListener('animationend', () => {
		delete headerNav.dataset.loading
	}, { passive: true })

	const argsAnimate = { duration: .25 },
		isAnimatingClass = 'header-nav--animated',
		stagger = -0.1
	let hoverTimer: NodeJS.Timeout

	const resetAnimation = (element: HTMLElement | null = navList): void => {
		if (!element) return
		element.classList.remove(isAnimatingClass)
		void element.offsetHeight		// trigger reflow
		element.classList.add(isAnimatingClass)
	}

	navList.addEventListener('mouseenter', () => {
		navItems.forEach((item, i) => Object.assign(
			item?.style, setAnimation({
				...argsAnimate,
				index: i,
				stagger,
				start: Math.abs(stagger * navItems.length),
			})
		))

		clearTimeout(hoverTimer)

		hoverTimer = setTimeout(() => {
			navList.classList.add('header-nav--active')
			resetAnimation()
		}, 100)
	}, { passive: true })

	navList.addEventListener('mouseleave', () => {
		navItems.forEach((item, i) => Object.assign(
			item?.style, setAnimation({
				...argsAnimate,
				index: i,
				stagger: Math.abs(stagger),
			})
		))

		clearTimeout(hoverTimer)

		hoverTimer = setTimeout(() => {
			navList.classList.remove('header-nav--active')
			resetAnimation()

			;([...navItems].at(-1))?.addEventListener('animationend', event => {
				event.stopPropagation()
				navList.classList.remove(isAnimatingClass)
				console.log('END ANIMATION')
			}, { once: true, passive: true })
		}, 100)
	}, { passive: true })
}
