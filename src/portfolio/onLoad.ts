import { fetchContent, getPage } from '../global/fetch.ts'
import { getBackground, wrapTrimEl } from '../global/utils.ts'
import { blockActions } from './block.ts'
import { lightboxActions } from './lightbox.ts'
// import './portfolio.css'


type LightboxGroup = {
	temp: HTMLDivElement
	title: HTMLElement
}


// where the magic happens

export const configureTemp = ({ cloneBlock, content, id }: {
	cloneBlock?: Element | undefined
	content: string
	id?: string | undefined
}) => {
	const blockClass = '.fe-block',
		temp = document.createElement('div')

	temp.innerHTML = content

	if (!!cloneBlock)
		temp.prepend(cloneBlock)

	// if (!!cloneBlock && !temp.querySelector('[data-html]'))
	// 	temp.prepend(cloneBlock)

	temp.querySelectorAll(blockClass).forEach(block => blockActions.format(block, id))

	return temp
}


document.addEventListener('DOMContentLoaded', () => {
	const blocks = document.querySelectorAll('.fluid-image-container')
	getBackground()

	blocks.forEach(async (current, index) => {
		const args = {
			index,
			target: current as HTMLElement
		}

		const { block, cloneBlock, details } = blockActions.configure(args)
		const { id, url } = getPage(args)

		const data = await fetchContent(url, id)?.then(async content => {
			if (typeof content !== 'string') return

			const temp = configureTemp({ cloneBlock, content, id }),
				title = await blockActions.getTitle({
					blocks,
					index,
					isWrapped: false,
				}),
				newTitle = wrapTrimEl(title, 'span')

			if (!title) return

			details.appendChild(newTitle ?? title)
			block.appendChild(details)

			return { temp, title } as LightboxGroup
		})

		const handleLightbox = ({ temp, title }: LightboxGroup) => current.addEventListener(
			'click', async event => {
				event.preventDefault()
				let lightbox

				if (temp.contains(title)) {
					const newTitle = wrapTrimEl(title, 'strong')

					if (!!newTitle)
						title.replaceWith(newTitle)
				}

				lightbox = lightboxActions.setup({
					content: temp.innerHTML,
					index,
					navigation: {
						next: await blockActions.getTitle({ blocks, index: index + 1 }),
						prev: await blockActions.getTitle({ blocks, index: index - 1 }),
					},
					properties: { id: `lightbox-${id}` }
				})

				return lightbox
			})

		if (!data || !Object.keys(data).length) return
		handleLightbox(data)
	})


	blockActions.style()
})

