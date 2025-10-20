import { Block, styleBlockTypography } from './block'
import { LightboxController } from './lightbox'


const Portfolio = {
	init: async () => {
		const blocks = document.querySelectorAll('.fluid-image-container') as NodeListOf<HTMLElement>
		const className = 'portfolio-block'

		const openLightbox = (event: MouseEvent, content: Block) => {
			event.preventDefault()
			const lightbox = new LightboxController({
				...content,
				elements: blocks,
				properties: { id: `lightbox-${content.page?.id}` },
			})

			if (!lightbox) return
			lightbox.open()
		}

		blocks.forEach(async (block: HTMLElement, index: number) => {
			const blockContent = await Block.init({
				className,
				index,
				target: block,
			})

			if (!blockContent) return

			block.addEventListener('click', (event: MouseEvent) => openLightbox(event, blockContent))
		})

		styleBlockTypography({ className })
	}
}


export { Portfolio }
