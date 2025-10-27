import {
	findChildBy,
	findElement,
	getPage,
	wrapContent,
} from '../../utils'

import { AnimationService, ContentService } from '../../services'
import type { BlockOptions, PageGroup } from '../../utils/utils.types'


export class BlockPortfolio {
	private readonly className: string
	private contentService: ContentService

	block: HTMLElement | null
	index: number
	page: PageGroup | null
	target: Node

	constructor({
		className,
		index,
		target,
	}: BlockOptions) {
		const block = findElement(target)

		this.className = className
		this.index = index
		this.page = getPage(target)
		this.target = block!.cloneNode(true)
		this.block = findElement(target)

		this.contentService = new ContentService()
	}

	static async init(options: BlockOptions): Promise<BlockPortfolio> {
		const instance = new BlockPortfolio(options)
		await instance.generate()
		return instance
	}

	private async generate(): Promise<void> {
		if (!this.block) return

		this.configureBlock()
		this.applyStyle()

		const content = await this.contentService.load(this.block)

		if (content)
			this.renderDetails(content)
	}

	private configureBlock(): void {
		if (!this.block) return

		const type = this.block.firstElementChild
						?.classList[1]
						?.match(/([a-z0-9-]+)-block/i)
						?.[1] ?? 'base'

		this.block.classList.add(
			this.className,
			`${this.className}__${type}`,
			'block--disabled'
		)

		Object.assign(this.block.dataset, {
			...this.page && { id: `block-${this.page.id}` },
			position: String(this.index),
		})
	}

	private applyStyle(): void {
		if (!this.block) return

		AnimationService.set(this.block, {
			className: 'block--disabled',
			index: this.index,
			stagger: .12,
			timeout: 500,
		})
	}

	private renderDetails(content: HTMLElement): void {
		if (!this.block) return

		const textBlocks = content.querySelectorAll('[data-sqsp-text-block-content]'),
			[titleBlock] = [...textBlocks].filter(
				el => !(/^H[1-4]$/.test(el.firstElementChild!.tagName))
			)
		const title = findChildBy(titleBlock as HTMLElement | undefined, { tagName: 'strong' })

		if (!title) return

		let newTitle = title.cloneNode(true)
		const details = document.createElement('div'),
			formattedTitle = wrapContent(title, 'span')

		if (formattedTitle) {
			newTitle = formattedTitle
			title.replaceChildren(formattedTitle.cloneNode(true))
		}

		details.classList.add(`${this.className}__details`)
		details.appendChild(newTitle)
		this.block.appendChild(details)
	}

	toLightboxOptions() {
		return {
			index: this.index,
			page: this.page,
			target: this.target,
		}
	}
}
