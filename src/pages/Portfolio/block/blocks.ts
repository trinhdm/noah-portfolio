import { AnimationService } from '../../../services'
import { getDeepestChild, wrapContent } from '../../../utils'
import type { BlockOptions } from '../../../utils/utils.types'


/** Static: Apply typography styles globally to all non-portfolio blocks */

const styleBlockTypography = ({ className }: Pick<BlockOptions, 'className'>) => {
	const parent = document.querySelector('.content .fluid-engine'),
		items = parent?.querySelectorAll(`.fe-block:not(${className})`)

	items?.forEach(item => {
		const [deepest] = getDeepestChild(item)
		const { textContent } = deepest ?? { textContent: '' }

		if (!textContent || !textContent.includes(' ')) return

		deepest.closest('.fe-block')?.classList.add(`header-block`)
		deepest.classList.add(`${className}__header`, 'block--disabled')
		deepest.textContent = ''

		textContent.split(' ')
			.map((str, index) => {
				const span = wrapContent(str, 'span')

				if (span)
					AnimationService.set(span, { index, stagger: .375 })

				return span
			})
			.filter(Boolean)
			.forEach(el => deepest.appendChild(el!))
	})
}


export { styleBlockTypography }
