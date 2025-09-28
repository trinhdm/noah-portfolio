import { getPage } from '../../global/fetch.ts'
import { findChildBy, getDeepestChild, tidyContent, wrapTrimEl } from '../../global/utils.ts'
import { getBlockTitle } from '../../utils/formatBlock.ts'


type BlockOptions = {
	index: number
	target: HTMLElement
}


export class Block {
	private page = {
		id: '',
		url: '',
	}

	private index: number = 0
	private selector: string = '.fe-block'
	private target: HTMLElement

	block?: HTMLElement | null
	clonedBlock?: Node

	constructor({
		index,
		target,
	}: BlockOptions) {
		this.block = this.get(target)
		this.clonedBlock = this.block?.cloneNode(true)

		this.page = getPage({ target })

		this.index = index
		this.target = target

		this.configure()
	}

	public static init(options: BlockOptions) {
		const instance = new Block(options)
		return instance
	}

	private get(target: HTMLElement | null): HTMLElement | null {
		if (!target)
			return null

		else if (target.classList.contains(this.selector))
			return target

		return target.closest(this.selector)
	}

	public async configure(): Promise<void> {
		if (!this.block) return

		this.block.classList.add('portfolio')
		this.block.id = `block-${this.page.id}`
		this.block.setAttribute('data-index', `${this.index}`)

		const blockStyles = {
			animationDelay: `${0.075 * this.index + 0.75}s`,
			order: this.index + 1,
		}

		Object.assign(this.block.style, blockStyles)

		const image = findChildBy(this.target, { tagName: 'img' }),
			title = await getBlockTitle(this.page)

		if (image)
			image.classList.add('portfolio__image')

		if (title) {
			const details = document.createElement('div'),
				newTitle = wrapTrimEl(title, 'span')

			details.classList.add('portfolio__details')
			details.appendChild(newTitle ?? title)

			this.block.appendChild(details)
		}
	}

	/** Static: Apply typography styles globally to all non-portfolio blocks */
	public static styleAll(): void {
		const items = document.querySelectorAll('.fe-block:not(.portfolio)')

		items.forEach(item => {
			const [deepest] = getDeepestChild(item)

			if (!!deepest.textContent) {
				const { textContent: text } = deepest

				if (!text.includes(' ')) return

				deepest.classList.add('block__typography')
				deepest.innerHTML = ''

				const elements = text.split(' ').map(str => tidyContent(str, 'span'))

				elements.forEach(el => {
					if (!el) return
					deepest.appendChild(el)
				})
			}
		})
	}
}
