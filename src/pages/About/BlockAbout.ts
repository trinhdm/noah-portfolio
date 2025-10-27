
import { getPage } from '../../global/fetch.ts'
import { findElement } from '../../utils/content.ts'
import { AnimationService } from '../../utils/AnimationService.ts'
import type { BlockOptions, PageGroup } from '../../global/utils.types'


export class BlockAbout {
	private readonly className: string

	block: HTMLElement | null
	index: number = 0
	page: PageGroup | null

	constructor({
		className,
		index,
		target,
	}: BlockOptions) {
		this.className = className
		this.index = index

		this.block = findElement(target)
		this.page = getPage(target)

		console.log('IS ABOUT')
	}

	public static init(options: BlockOptions) {
		const instance = new BlockAbout(options)

		instance.configure()
		instance.style()

		return instance
	}

	private configure(): void {
		if (!this.block) return

		const [type] = this.block.querySelector('.sqs-block')?.classList[1]?.split('-block') ?? 'base'

		this.block.classList.add(
			this.className,
			`${this.className}__${type}`,
			'block--disabled'
		)

		if (this.page)
			this.block.id = `block-${this.page.id}`
	}

	private style(): void {
		if (!this.block) return

		AnimationService.set(this.block, {
			className: 'block--disabled',
			delay: .875,
			index: this.index,
			stagger: .5,
		})
	}
}
