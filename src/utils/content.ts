import { findChildBy } from './dom'
import type { BlockTypes } from '../types'


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

export const getBlockType = (block: HTMLElement): BlockTypes | null => {
	const className = block.firstElementChild?.classList[1],
		matchClass = className?.match(/([a-z0-9-]+)-block/i)
	return (matchClass?.[1] ?? null) as BlockTypes | null
}

export const isHeaderTag = (tag: string) => /^H[1-4]$/.test(tag)

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
