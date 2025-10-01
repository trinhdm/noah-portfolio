
import { getBackground } from './global/utils.ts'
import { handleHeader } from './global/header.ts'
import { portfolio } from './portfolio'
import './global/global.css'


document.addEventListener('DOMContentLoaded', () => {
	getBackground()
	handleHeader()

	const url = window.location.href

	if (url.includes('portfolio'))
		portfolio.init()
})
