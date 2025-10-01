import { Block, styleBlockTypography } from './block'
import { createLightbox } from './lightbox'


const portfolio = {
	init: async () => {
		const blocks = document.querySelectorAll('.fluid-image-container') as NodeListOf<HTMLElement>
		const className = 'portfolio-block'

		blocks.forEach(async (block: HTMLElement, index: number) => {
			const blockContent = await Block.init({
				className,
				index,
				target: block,
			})

			if (!blockContent) return

			block.addEventListener('click', async (event: MouseEvent) => {
				event.preventDefault()
				event.stopPropagation()
				createLightbox(blockContent)
			})
		})

		styleBlockTypography({ className })
	}
}


export { portfolio }
