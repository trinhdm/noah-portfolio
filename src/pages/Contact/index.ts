import { BlockContact } from './BlockContact.ts'
import './contact.css'


const Contact = {
	init: () => {
		const blocks = document.querySelectorAll('.sqs-block') as NodeListOf<HTMLElement>
		const className = 'contact-block'


		blocks.forEach((block: HTMLElement, index: number) => {
			const blockEl = BlockContact.init({
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


export { Contact }
