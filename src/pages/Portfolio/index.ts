import { styleBlockTypography } from './helpers'
import { BlockPortfolio } from './BlockPortfolio'
import { LightboxController } from '../../components/Lightbox'
import './portfolio.css'


const Portfolio = {
	init: async () => {
		const blocks = Array.from(document.querySelectorAll<HTMLElement>('.fluid-image-container')),
			className = 'portfolio-block'

		try {
			const instances = await Promise.all(
				blocks.map((block, index) =>
					BlockPortfolio.init({ className, index, target: block })
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

			styleBlockTypography({ className })
		} catch (err) { console.error(err) }
	}
}


export { Portfolio }
