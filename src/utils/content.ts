import { findChildBy } from './dom'


export const getBackground = (selector: string = '.section-background') => {
	const target = document.querySelector(selector)
	if (!target || !target.children.length || !target.querySelector('img')) return null

	const background = document.createElement('div')
	background.classList.add('background')
	background.append(target.cloneNode(true))

	const image = findChildBy(background, { tagName: 'img' }),
		overlay = background.querySelector('.section-background-overlay')

	if (!!image && !!overlay)
		(image as HTMLImageElement).style.opacity = (overlay as HTMLDivElement).style.opacity

	document.querySelector('.content-wrapper')?.prepend(background)
}


export const wrapContent = (
	input: HTMLElement | string | null | undefined,
	tag: string = 'span',
	sanitize = true
): HTMLElement | null => {
	if (!input) return null

	let content = typeof input === 'string' ? input : input.innerHTML
	const wrapper = document.createElement(tag)

	if (sanitize)
		content = content.replaceAll('<br>', '').trim()

	wrapper.innerHTML = content

	return wrapper
}
