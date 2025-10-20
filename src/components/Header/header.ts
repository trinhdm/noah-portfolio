import { setAnimation } from '../../utils/css'


type NavEventOptions = {
	args: {
		duration: number
		stagger: number
	}
	navList: HTMLElement
	timer: NodeJS.Timeout
}

const onLoadHeader = (headerNav: HTMLElement) => {
	headerNav.dataset.loading = 'true'

	headerNav.addEventListener('animationend', () => {
		delete headerNav.dataset.loading
	}, { passive: true })
}

const resetAnimation = (element: HTMLElement | null, className = 'header-nav--animated'): void => {
	if (!element) return
	element.classList.remove(className)
	void element.offsetHeight		// trigger reflow
	element.classList.add(className)
}

const onEnterNav = ({
	args,
	navList,
	timer,
}: NavEventOptions) => {
	const navItems = navList.querySelectorAll('.header-nav-item') as NodeListOf<HTMLElement>

	// navItems.forEach((item, index) => Object.assign(
	// 	item?.style, setAnimation({
	// 		...args,
	// 		index: i,
	// 		start: Math.abs(args.stagger * navItems.length),
	// 	})
	// ))

	navItems.forEach((item, index) => setAnimation(item, {
		...args,
		index,
		start: Math.abs(args.stagger * navItems.length),
	}))

	clearTimeout(timer)

	timer = setTimeout(() => {
		navList.classList.add('header-nav--active')
		resetAnimation(navList)
	}, 100)
}

const onLeaveNav = ({
	args,
	navList,
	timer,
}: NavEventOptions) => {
	const navItems = navList.querySelectorAll('.header-nav-item') as NodeListOf<HTMLElement>

	// navItems.forEach((item, i) => Object.assign(
	// 	item?.style, setAnimation({
	// 		...args,
	// 		index: i,
	// 		stagger: Math.abs(args.stagger),
	// 	})
	// ))

	navItems.forEach((item, index) => setAnimation(item, {
		...args,
		index,
		stagger: Math.abs(args.stagger),
	}))

	clearTimeout(timer)

	timer = setTimeout(() => {
		navList.classList.remove('header-nav--active')
		resetAnimation(navList)

		;([...navItems].at(-1))?.addEventListener('animationend', event => {
			event.stopPropagation()
			navList.classList.remove('header-nav--animated')
			console.log('END ANIMATION')
		}, { once: true, passive: true })
	}, 100)
}

export const handleHeader = () => {
	const headerNav = document.querySelector('.header-nav') as HTMLElement | null,
		navList = headerNav?.querySelector('.header-nav-list') as HTMLElement | null

	if (!headerNav || !navList) return

	const args = { duration: .25, stagger: -0.1 }
	let timer: NodeJS.Timeout

	onLoadHeader(headerNav)

	navList.addEventListener('mouseenter', () => {
		onEnterNav({ args, navList, timer })
	}, { passive: true })

	navList.addEventListener('mouseleave', () => {
		onLeaveNav({ args, navList, timer })
	}, { passive: true })
}
