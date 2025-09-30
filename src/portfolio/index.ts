import { Block, styleBlockTypography } from './block'
import { Lightbox, LightboxContent } from './lightbox'


const portfolio = {
	init: async () => {
		const blocks = document.querySelectorAll('.fluid-image-container') as NodeListOf<HTMLElement>
		const className = 'portfolio-block'

		const createLightbox = async ({ index, page }: Partial<Block>) => {
			const { content, navigation } = await LightboxContent.retrieve({ index, elements: blocks, page })

			const lightbox = new Lightbox({
				content,
				navigation,
				properties: { id: `lightbox-${page?.id}` },
			}),
				{ lightbox: lightboxEl } = lightbox

			if (!lightbox) return

			lightbox.open()
			lightboxEl.querySelectorAll('.lightbox__arrow').forEach(arrow => arrow.addEventListener('click', event => {
				event.preventDefault()
				const nextIndex = (arrow as HTMLElement).dataset.position as `${number}` | undefined

				lightbox.close()

				if (nextIndex)
					createLightbox({ index: parseInt(nextIndex) as Block['index'] })
			}))
		}


		blocks.forEach(async (block: HTMLElement, index: number) => {
			const blockEl = await Block.init({
				className,
				index,
				target: block,
			})

			if (!blockEl) return

			block.addEventListener('click', async (event: MouseEvent) => {
				event.preventDefault()
				createLightbox(blockEl)
			})
		})

		styleBlockTypography({ className })
	}
}


export { portfolio }
