import { findElement, getBlockType, wrapContent } from '../../utils'
import { AnimationService, ContentService } from '../../services'
import type { BlockOptions } from '../../types'


export class BlockPortfolio {
	private readonly className: string
	private contentService: ContentService

	block: HTMLElement | null
	id: string
	index: number
	target: Node

	constructor({
		className,
		index,
		target,
	}: BlockOptions) {
		this.className = className
		this.id = ''
		this.index = index

		const element = findElement(target)
		this.block = element
		this.target = element!.cloneNode(true)

		this.contentService = new ContentService()
	}

	static async init(options: BlockOptions): Promise<BlockPortfolio> {
		const instance = new BlockPortfolio(options)
		await instance.generate()
		return instance
	}

	private async generate(): Promise<void> {
		if (!this.block) return

		const { id, title } = await this.contentService.load(this.block)
		this.id = id

		this.configureBlock()
		this.applyStyle()
		this.renderDetails(title)
	}

	private configureBlock(): void {
		if (!this.block) return
		const type = getBlockType(this.block) ?? 'base'

		this.block.classList.add(
			this.className,
			`${this.className}__${type}`
		)

		Object.assign(this.block.dataset, {
			id: `block-${this.id}`,
			position: String(this.index),
		})
	}

	private applyStyle(): void {
		if (!this.block) return

		AnimationService.set(this.block, {
			index: this.index,
			stagger: .12,
			timeout: 500,
		})
	}

	private renderDetails(title?: string): void {
		if (!this.block) return

		const details = document.createElement('div'),
			newTitle = wrapContent(title, 'span')

		if (newTitle)
			details.appendChild(newTitle)

		details.classList.add(`${this.className}__details`)
		this.block.appendChild(details)
	}

	toLightboxOptions() {
		return {
			id: this.id,
			index: this.index,
			target: this.target,
		}
	}
}
