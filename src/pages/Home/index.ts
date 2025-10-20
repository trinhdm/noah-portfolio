import { BlockHome } from './BlockHome.ts'
import './home.css'


const Home = {
	init: () => {
		const blocks = document.querySelectorAll('.sqs-block') as NodeListOf<HTMLElement>
		const className = 'home-block'


		blocks.forEach((block: HTMLElement, index: number) => {
			const blockEl = BlockHome.init({
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


export { Home }
