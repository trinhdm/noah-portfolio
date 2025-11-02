import { getBlockType, toggleDisableAttr } from '../../utils'
import { AnimationService as Animation, ContentService } from '../../services'
import type { BlockOptions } from '../../types'


export class BlockPortfolio {
	private readonly className: string
	private readonly content: ContentService
	readonly index: number

	block: HTMLElement
	id: string = ''

	constructor(
		options: BlockOptions,
		contentService: ContentService
	) {
		const { className, index, target } = options

		this.block = target
		this.className = className
		this.content = contentService
		this.index = index
	}

	toLightboxOptions() {
		return {
			id: this.id,
			index: this.index,
			target: this.block,
		}
	}

	static async init(
		options: BlockOptions,
		contentService: ContentService
	): Promise<BlockPortfolio> {
		const instance = new BlockPortfolio(options, contentService)
		await instance.generate()
		return instance
	}

	static async watch(target: BlockOptions['target']) {
		await Animation.waitForEnd(target)
		toggleDisableAttr(target)
	}

	private async generate(): Promise<void> {
		toggleDisableAttr(this.block)

		const { id, title } = await this.content.load(this.block, 'span')
		this.id = id

		this.configureBlock()
		this.applyStyle()
		this.renderDetails(title)
	}

	private configureBlock(): void {
		const type = getBlockType(this.block) ?? 'base'

		this.block.classList.add(
			this.className,
			`${this.className}__${type}`
		)

		Object.assign(this.block.dataset, {
			id: `block-${this.id}`,
			position: (this.index).toString(),
		})
	}

	private applyStyle() {
		Animation.set(this.block, {
			index: this.index,
			stagger: .12,
			timeout: 500,
		})
	}

	private renderDetails(title: HTMLElement | null): void {
		if (!title) return

		const details = document.createElement('div')
		details.classList.add(`${this.className}__details`)

		details.appendChild(title)
		this.block.appendChild(details)
	}
}
