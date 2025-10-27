import { AnimationService } from '../../services'
import { getDeepestChild, wrapContent } from '../../utils'
import type { BlockOptions } from '../../utils/utils.types'


/** Static: Apply typography styles globally to all non-portfolio blocks */

const styleBlockTypography = ({ className }: Pick<BlockOptions, 'className'>) => {
	const parent = document.querySelector('.content .fluid-engine'),
		items = parent?.querySelectorAll(`.fe-block:not(${className})`)

	items?.forEach(item => {
		const [deepest] = getDeepestChild(item)
		if (!deepest) return

		const block = deepest.closest('.fe-block')
		if (!block || !deepest.textContent) return

		block.classList.add('header-block')
		deepest.classList.add(`${className}__header`, 'block--disabled')

		const text = deepest.textContent.trim()
		deepest.textContent = ''

		text.split(' ').reduce((_, word, index) => {
			const span = wrapContent(word, 'span')
			if (!span) return _

			AnimationService.set(span, { index, stagger: .375 })
			deepest.appendChild(span)
			return _
		}, null)
	})
}


export { styleBlockTypography }
