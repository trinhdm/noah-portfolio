import { findChildBy, getDeepestChild, tidyContent, wrapTrimEl } from '../../global/utils.ts'
import type { BlockOptions } from './block.types'


const styleHeaderBlocks = ({ className }: Pick<BlockOptions, 'className'>) => {
	const items = document.querySelectorAll(`.fe-block:not(${className})`)

	if (!items.length) return

	items.forEach(item => {
		const [deepest] = getDeepestChild(item)
		const { textContent } = deepest ?? { textContent: '' }

		if (!textContent || !textContent.includes(' ')) return

		deepest.classList.add(`${className}__header`)
		deepest.textContent = ''

		textContent.split(' ')
			.map(str => tidyContent(str, 'span'))
			.filter(Boolean)
			.forEach(el => deepest.appendChild(el!))
	})
}


export { styleHeaderBlocks }
