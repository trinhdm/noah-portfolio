import { BlockAbout } from './BlockAbout.ts'
import './about.css'


const About = {
	init: () => {
		const blocks = document.querySelectorAll('.sqs-block') as NodeListOf<HTMLElement>
		const className = 'about-block'


		blocks.forEach((block: HTMLElement, index: number) => {
			const blockEl = BlockAbout.init({
				className,
				index,
				target: block,
			})

			if (!blockEl) return

			block.addEventListener('click', (event: MouseEvent) => {
				event.preventDefault()
				event.stopPropagation()
			})
		})

		// styleBlockTypography({ className })
	}
}


export { About }
