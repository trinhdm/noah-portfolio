
import { fetchContent, getPage } from '../../global/fetch.ts'
import { findChildBy, wrapTrimEl } from '../../global/utils.ts'
import { resetBlock, setAnimation } from '../../utils/css.ts'
import { formatBlock } from './formatBlock.ts'
import type { BlockOptions } from './block.types'
import type { PageGroup } from '../../global/utils.types'


export class Block {
	private clonedBlock: HTMLElement | null
	private className: string = ''
	private selector: string = '.fe-block'

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
		this.index = index
		this.page = getPage(target)
		this.block = this.get(target)
		this.clonedBlock = this.block?.cloneNode(true) as HTMLElement ?? null

		this.content = undefined
		this.className = className
	}

	public static async init(options: BlockOptions) {
		const instance = new Block(options),
			content = await instance.setContent()

		instance.configure()
		instance.setDetails(content)
		instance.style()
		instance.content = content

		return instance
	}

	private get(target: HTMLElement | null): HTMLElement | null {
		if (!target)
			return null

		else if (target.classList.contains(this.selector))
			return target

		return target.closest(this.selector)
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

	private async fetch(
		page: PageGroup = this.page
	): Promise<string> {
		const content = await fetchContent(page)
		return content ?? ''
	}

	private style(): void {
		if (!this.block) return

		const argsAnimate = {
			duration: .875,
			index: this.index,
			stagger: .15,
		}

		Object.assign(this.block.style, {
			...setAnimation(argsAnimate),
			order: this.index + 1,
		})

		resetBlock({
			block: this.block,
			className: `${this.className}--disabled`,
			timeout: 300,
		})
	}

	private async setContent(
		page: PageGroup = this.page
	): Promise<HTMLDivElement | undefined> {
		const content = await this.fetch(page)

		if (typeof content !== 'string') return

		const imageWrapper: HTMLElement | null = (this.clonedBlock
			?.querySelector('[data-sqsp-image-block-image-container]')
			?.closest(this.selector)) ?? null
		const temp: HTMLDivElement | undefined = document.createElement('div')

		if (imageWrapper && !temp.contains(imageWrapper))
			temp.prepend(imageWrapper!)

		temp.innerHTML += content
		temp.querySelectorAll(this.selector).forEach(block => formatBlock(block as HTMLElement, page.id))

		return temp
	}

	private setDetails(content?: HTMLElement): void {
		const titleWrapper = content?.querySelector('[data-sqsp-text-block-content]') as HTMLElement | undefined

		if (titleWrapper) {
			const details = document.createElement('div'),
				title = findChildBy(titleWrapper, { tagName: 'strong' })

			if (!title) return

			const newTitle = wrapTrimEl(title, 'span')

			details.classList.add(`${this.className}__details`)
			details.appendChild(newTitle ?? title)

			this.block?.appendChild(details)
		}
	}
}
