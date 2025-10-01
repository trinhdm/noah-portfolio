
import { getBackground } from './global'
import { handleHeader } from './components'
import { portfolio } from './portfolio'


document.addEventListener('DOMContentLoaded', () => {
	getBackground()
	handleHeader()

	const url = window.location.href

	if (url.includes('portfolio'))
		return portfolio.init()
})
