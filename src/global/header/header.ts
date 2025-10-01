import { setAnimation } from '../../utils/css'


const handleHeader = () => {
	const headerNav = document.querySelector('.header-nav-wrapper'),
		navList = headerNav?.querySelector('.header-nav-list')
	const navItems = headerNav?.querySelectorAll('.header-nav-item') as NodeListOf<HTMLElement>


	if (!headerNav || !navList) return

	const isAnimatingClass = 'header-nav--animated'

	navItems.forEach((item, i) => {
		// const link = item.querySelector('a')
		// if (!link) return

		Object.assign(item?.style, setAnimation({
			duration: .25,
			index: i,
			stagger: -.125,
			start: .125 * navItems.length
			// start: this.isActive ? .75 : 0,
		}))


		if (i === 0 && navList.classList.contains(isAnimatingClass)) {
			item.addEventListener('animationend', () => {
				console.log('LAST ITEM')
				navList.classList.remove(isAnimatingClass)
			}, { once: true })
		}

		// this.elements.reset(block)
	})

	console.log('HEADER')
	let hoverTimer: NodeJS.Timeout

	navList.addEventListener('mouseover', event => {
		event.stopPropagation()

		if (!navList.classList.contains(isAnimatingClass))
			navList.classList.add(isAnimatingClass)

		clearTimeout(hoverTimer)

		hoverTimer = setTimeout(function() {
			navList.classList.add('header-nav--active')
			console.log('mouseover')
		}, 200)
	})

	navList.addEventListener('mouseout', event => {
		event.stopPropagation()

		clearTimeout(hoverTimer)

		hoverTimer = setTimeout(function() {
			navList.classList.remove('header-nav--active')
			console.log('mouseout')
		}, 100)
	})
}


export { handleHeader }
