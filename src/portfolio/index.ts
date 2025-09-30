import { Block, styleBlockTypography } from './block'
import { BlockInit } from './block/BlockInit'


const portfolio = {
	init: async () => {
		const blocks = document.querySelectorAll('.fluid-image-container') as NodeListOf<HTMLElement>
		const className = 'portfolio-block'
		let clickedBlock: number | null = null
		let asyncResult = null

		const createLightbox = async (index: number) => {
			const lightBlock = await Block.init({
				className,
				elements: blocks,
				index,
			})

			const { lightbox } = lightBlock.lightbox!

			if (!lightbox) return
			let nextIndex: `${number}` | null = null

			lightbox.querySelectorAll('.lightbox__arrow').forEach(arrow => arrow.addEventListener('click', e => {
				e.preventDefault()
				nextIndex = (arrow as HTMLElement).dataset.position as `${number}`

				lightBlock.closeLightbox()

				if (nextIndex)
					createLightbox(parseInt(nextIndex))
			}))
		}


		blocks.forEach(async (block: HTMLElement, index: number) => {
			const blockEl = await BlockInit.init({
				className,
				index,
				target: block,
			})

			if (!blockEl) return

			block.addEventListener('click', async (event: MouseEvent) => {
				event.preventDefault()
				clickedBlock = blockEl.index
				createLightbox(blockEl.index)
			})
		})

		styleBlockTypography({ className })
	}
}


export { portfolio }
