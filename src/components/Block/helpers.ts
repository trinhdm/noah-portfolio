import { getDeepestChild, toggleDisableAttr, wrapContent } from '../../utils'
import { AnimationService } from '../../services'
import type { BlockOptions } from '../../types'


const stylePageHeaderBlock = (
	selector: string,
	className: BlockOptions['className']
): HTMLElement | null => {
	const items = document.querySelectorAll(`.fe-block:not(:has(${selector}))`)

	if (!items?.length) return null
	const [target] = Array.from(items) as HTMLElement[]

	if (target.querySelector('.sqs-html-content'))
		applyHeaderBlockStyle(target, className)

	return target as HTMLElement
}

const applyHeaderBlockStyle = (
	block: HTMLElement,
	className: BlockOptions['className']
) => {
	const [deepest] = getDeepestChild(block)

	if (!deepest || !deepest.textContent) return
	const elements: HTMLElement[] = [],
		text = deepest.textContent.trim().split(/\s+/)

	toggleDisableAttr(block)
	deepest.replaceChildren()

	block.classList.add('header-block')
	deepest.classList.add(`${className}__header`)

	for (const word of text) {
		const span = wrapContent(word, 'span')
		if (!span) continue

		deepest.appendChild(span)
		elements.push(span)
	}

	requestAnimationFrame(() => (
		elements.forEach((el, index) => AnimationService.set(el, { index, stagger: .375 }))
	))
}


export { stylePageHeaderBlock }
