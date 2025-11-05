import { getBlockType, toggleDisableAttr } from '../../utils'
import { AnimationService as Animation, ContentService } from '../../services'
import type { BlockOptions, PageDetails } from '../../types'


export class BlockPortfolio {
	private readonly className: string
	private readonly baseAnimation: BlockOptions['animation'] = {
		stagger: .125,
		timeout: 250,
	}

	readonly index: number
	block: HTMLElement
	id: string = ''

	constructor(
		private options: BlockOptions,
		private contentService: ContentService
	) {
		const { className, index, target } = this.options
		this.block = target
		this.className = className
		this.contentService = contentService
		this.index = index

		this.baseAnimation = {
			...this.baseAnimation,
			index: this.index,
		}
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
		await instance.update()
		return instance
	}

	static async watch(target: BlockOptions['target']) {
		await Animation.waitForEnd(target)
		toggleDisableAttr(target)
	}

	private async update(): Promise<void> {
		toggleDisableAttr(this.block)

		const { id, title } = await this.contentService.load(this.block)
		this.id = id

		this.configureBlock()
		this.applyStyle()
		this.renderDetails(title)
	}

	private configureBlock(): void {
		const type = getBlockType(this.block) ?? 'base'
		this.block.classList.add(this.className, `${this.className}__${type}`)

		Object.assign(this.block.dataset, {
			id: `block-${this.id}`,
			position: (this.index).toString(),
		})
	}

	private applyStyle() {
		const { animation } = this.options
		const animOptions = animation
			? Object.assign({}, this.baseAnimation, animation)
			: this.baseAnimation

		Animation.set(this.block, animOptions)
	}

	private renderDetails(title: PageDetails['title']): void {
		if (!title) return

		const details = document.createElement('div')
		details.classList.add(`${this.className}__details`)

		details.appendChild(title)
		this.block.appendChild(details)
	}
}
