import { Block, styleBlockTypography } from './block'
import { LightboxController } from '../../components/Lightbox'


const Portfolio = {
	init: async () => {
		const blocks = Array.from(document.querySelectorAll<HTMLElement>('.fluid-image-container')),
			className = 'portfolio-block'

		try {
			const instances = await Promise.all(
					blocks.map((block, index) =>
						Block.init({ className, index, target: block })
					)
			)

			document.body.addEventListener('click', (event: MouseEvent) => {
				const target = (event.target as HTMLElement).closest(`.${className}`),
					block = instances.find(b => b['block'] === target)

				if (!block) return
				event.preventDefault()

				const lightbox = new LightboxController({
					...block.toLightboxOptions(),
					elements: blocks,
					properties: { id: `lightbox-${block['page']?.id}` }
				})

				lightbox.open()
			})
		} catch (err) { console.error(err) }

		styleBlockTypography({ className })
	}
}


export { Portfolio }
