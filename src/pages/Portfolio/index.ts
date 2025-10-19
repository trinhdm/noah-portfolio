import { Block, styleBlockTypography } from './block'
// import { createLightbox } from './lightbox'
import { Lightbox } from './lightbox/wips/new'


const Portfolio = {
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

				const lightbox = new Lightbox({
					...blockContent,
					elements: blocks,
					properties: { id: `lightbox-${blockContent.page?.id}` },
				})

				console.log({ blockContent, lightbox })

				if (!lightbox) return

				lightbox.open()


				// createLightbox(blockContent)
			})
		})

		styleBlockTypography({ className })
	}
}


export { Portfolio }
