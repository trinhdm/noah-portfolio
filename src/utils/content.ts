import { findChildBy } from './dom'
import type { PageGroup } from './utils.types'


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


export const getPage = (element: HTMLElement | null): PageGroup | null => {
	const anchor = element
		? findChildBy(element, { tagName: 'a' })
		: null
	if (!anchor) return null

	const { hash, href } = anchor as HTMLAnchorElement
	const id = hash?.slice(1),
		[url] = href?.split('#')

	if (!id || !url) return null
	return { id, url }
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
