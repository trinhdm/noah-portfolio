import { getBackground } from '../global/utils.ts'
import { getPage } from '../global/fetch.ts'
import { formatContent } from '../utils/formatBlock.ts'
import { Block } from './block/construct.ts'
import { Lightbox } from './lightbox'


document.addEventListener('DOMContentLoaded', () => {
	const blocks = document.querySelectorAll('.fluid-image-container')

	blocks.forEach(async (block, index) => {
		const args = {
			target: block as HTMLElement
		}

		const { id, url } = getPage(args)
		const content = await formatContent({ id, url })

		Block.init({
			index,
			target: block as HTMLElement
		})

		block.addEventListener('click', async event => {
			event.preventDefault()

			const lightbox = new Lightbox({
				content,
				index,
				// navigation: {
				// 	next: await blockActions.getTitle({ blocks, index: index + 1 }),
				// 	prev: await blockActions.getTitle({ blocks, index: index - 1 }),
				// },
				navigation: {
					next: 'next',
					prev: 'prev',
				},
				properties: { id: `lightbox-${id}` }
			})

			lightbox.open()

			return lightbox
		})
	})


	Block.styleAll()
	getBackground()
})
