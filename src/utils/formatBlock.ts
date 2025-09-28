import { fetchContent } from '../global/fetch.ts'
import { findChildBy, wrapTrimEl } from '../global/utils.ts'


export const formatBlock = (
	block: Element,
	id: string = ''
) => {
	const getChildBlocks = (selector: string) => (
		(block.querySelector(selector) as HTMLElement | undefined)?.children
	)

	const type = block.querySelector('.sqs-block')?.classList[1]?.split('-block')[0]
	let condition: boolean | undefined,
		els = undefined,
		html: HTMLElement | string | undefined = ''

	switch (type) {
		case 'code':
			els = !!id ? getChildBlocks(`#${id}`) : undefined
			break
		case 'html':
			els = getChildBlocks('.sqs-html-content')
			condition = !!els
				? !(els.length === 1 && ['H1', 'H2', 'H3', 'H4'].includes(els[0].tagName))
				: undefined
			break
		case 'image':
			[els] = getChildBlocks('[data-animation-role]')
			html = !!els ? findChildBy(els as HTMLElement, { tagName: 'img' }) : ''
			break
		case 'video':
			const nativeVideo = block.querySelector('[data-config-video]'),
				ytVideo = block.querySelector('[data-html]')

			if (!!ytVideo) {
				els = ytVideo as HTMLElement
				html = els?.dataset?.html?.trim()
			}

			// else if (!!nativeVideo) {
			// 	els = nativeVideo as HTMLElement
			// 	html = els?.dataset?.configVideo?.trim()
			// }
			break
	}

	if (!els) return

	if (typeof condition !== 'boolean')
		condition = els instanceof HTMLCollection
			? !!els?.length
			: !!els

	if (!!condition) {
		block.classList.add(`lightbox__${type}`)

		if (!html) return

		els = els as HTMLElement
		els.innerHTML = ''

		switch (typeof html) {
			case 'object':
				return els.appendChild(html)
			case 'string':
				return (els.innerHTML = html)
		}
	} else {
		block.remove()
	}
}


/** Fetch and return the block title */
export const getBlockTitle = async (page, isWrapped: boolean = true) => {
	const blockClass = '.fe-block',
		temp = document.createElement('div')

	return await fetchContent(page)?.then(content => {
		if (typeof content !== 'string') return

		temp.innerHTML = content
		temp.querySelectorAll(blockClass).forEach(block => formatBlock(block as HTMLElement, page.id))

		const wrapper: HTMLElement | null = temp.querySelector('[data-sqsp-text-block-content]')
		const title = findChildBy(wrapper, { tagName: 'strong' })

		if (!title) return

		return isWrapped
			? wrapTrimEl(title, 'span')
			: title
	})
}


export const formatContent = async (page): Promise<string> => {
	const content = await fetchContent(page)?.then(async data => data)

	const blockClass = '.fe-block',
		temp = document.createElement('div')

	if (content) {
		temp.innerHTML = content
		temp.querySelectorAll(blockClass).forEach(block => formatBlock(block, page.id))
		// console.log({ temp })

		// if (temp.contains(title)) {
		// 	const newTitle = wrapTrimEl(title, 'strong')

		// 	if (!!newTitle)
		// 		title.replaceWith(newTitle)
		// }
	}

	return temp.innerHTML
}
