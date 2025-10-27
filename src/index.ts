import { getBackground } from './utils'
import { handleHeader } from './components'

import {
	About,
	Contact,
	Home,
	Portfolio,
} from './pages'

import './assets/styles'

document.addEventListener('DOMContentLoaded', () => {
	getBackground()
	handleHeader()

	const url = window.location.href

	if (url === window.location.origin + '/')
		return Home.init()

	else if (url.includes('about'))
		return About.init()

	else if (url.includes('portfolio'))
		return Portfolio.init()

	else if (url.includes('contact'))
		return Contact.init()
})
