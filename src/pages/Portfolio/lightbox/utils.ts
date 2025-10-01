import { Block } from '../block'
import { Lightbox } from './Lightbox.ts'
import { LightboxContent } from './LightboxContent.ts'


const createLightbox = async ({ index, page }: Partial<Block>) => {
	const blocks = document.querySelectorAll('.fluid-image-container') as NodeListOf<HTMLElement>
	const { content, navigation } = await LightboxContent.retrieve({ index, elements: blocks, page })

	const lightbox = new Lightbox({
		content,
		navigation,
		properties: { id: `lightbox-${page?.id}` },
	})

	if (!lightbox) return

	const { lightbox: lightboxEl } = lightbox
	let position: `${number}` | undefined

	lightbox.open()

	lightboxEl.querySelectorAll('.lightbox__arrow').forEach(
		arrow => arrow.addEventListener('click', async event => {
		event.preventDefault()
		event.stopPropagation()

		position = (arrow as HTMLElement).dataset.position as `${number}` | undefined

		lightbox.close()
	}))

	// if (position) {
	// 	const nextIndex = parseInt(position),
	// 		[nextBlock] = [...blocks].filter(block => parseInt(`${block.dataset.position}`) === nextIndex)

	// 	const nextBlockContent = await Block.init({
	// 		className,
	// 		index: nextIndex,
	// 		target: nextBlock,
	// 	})

	// 	console.log({ nextBlockContent, lightboxEl })
	// 	// createLightbox(nextBlockContent)

	// 	lightboxEl?.querySelector('.lightbox__overlay')?.addEventListener('animationend', () => {
	// 		console.log('test')
	// 		// createLightbox(nextBlockContent)
	// 	})
	// }
}


export { createLightbox }
