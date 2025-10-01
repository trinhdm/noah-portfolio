import { getDeepestChild, tidyContent } from '../../../global/utils.ts'
import { setAnimation } from '../../../utils/css.ts'
import type { BlockOptions } from '../../../global/utils.types'


/** Static: Apply typography styles globally to all non-portfolio blocks */

const styleBlockTypography = ({ className }: Pick<BlockOptions, 'className'>) => {
	const items = document.querySelectorAll(`.fe-block:not(${className})`)
	// console.log('glob', (window as any).GLOBAL_BLOCK_CLASS)

	items?.forEach(item => {
		const [deepest] = getDeepestChild(item)
		const { textContent } = deepest ?? { textContent: '' }

		if (!textContent || !textContent.includes(' ')) return

		deepest.closest('.fe-block')?.classList.add(`header-block`)
		deepest.classList.add(`${className}__header`, 'block--disabled')
		deepest.textContent = ''

		textContent.split(' ')
			.map((str, i) => {
				const span = tidyContent(str, 'span')

				if (span)
					Object.assign(span.style, setAnimation({
						duration: .5,
						index: i,
						stagger: .375,
					}))

				return span
			})
			.filter(Boolean)
			.forEach(el => deepest.appendChild(el!))
	})
}


export { styleBlockTypography }
