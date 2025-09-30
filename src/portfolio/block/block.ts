
import { getPage } from '../../global/fetch.ts'
import { findChildBy, wrapTrimEl } from '../../global/utils.ts'
import { resetBlock, setAnimation } from '../../utils/css.ts'
import { findElement, setContent } from '../../utils/content.ts'
import type { BlockOptions } from './block.types'
import type { PageGroup } from '../../global/utils.types'


export class Block {
	private className: string = ''

	block: HTMLElement | null
	content: HTMLDivElement | undefined
	index: number = 0
	page: PageGroup = {
		id: '',
		url: '',
	}

	constructor({
		className,
		index,
		target,
	}: BlockOptions) {
		this.className = className
		this.index = index

		this.block = findElement(target)
		this.content = undefined
		this.page = getPage(target)
	}

	public static async init(options: BlockOptions) {
		const instance = new Block(options),
			content = await setContent(instance)

		instance.configure()
		instance.style()
		instance.set(content)
		instance.content = content

		return instance
	}

	private configure(): void {
		if (!this.block) return

		this.block.classList.add(this.className, `${this.className}--disabled`)
		this.block.id = `block-${this.page.id}`
		this.block.dataset.position = String(this.index)

		const image = findChildBy(this.block, { tagName: 'img' })

		if (image)
			image.classList.add(`${this.className}__image`)
	}

	private style(): void {
		if (!this.block) return

		const argsAnimate = {
			duration: .575,
			index: this.index,
			stagger: .15,
			start: .375,
		}

		Object.assign(this.block.style, {
			...setAnimation(argsAnimate),
			order: this.index + 1,
		})

		resetBlock({
			block: this.block,
			className: `${this.className}--disabled`,
			timeout: 1250,
		})
	}

	private set(content?: HTMLElement): void {
		const titleWrapper = content?.querySelector('[data-sqsp-text-block-content]') as HTMLElement | undefined

		if (titleWrapper) {
			const details = document.createElement('div'),
				title = findChildBy(titleWrapper, { tagName: 'strong' })

			if (!this.block || !title) return

			const newTitle = wrapTrimEl(title, 'span')

			details.classList.add(`${this.className}__details`)
			details.appendChild(newTitle ?? title)

			this.block.appendChild(details)
		}
	}
}
