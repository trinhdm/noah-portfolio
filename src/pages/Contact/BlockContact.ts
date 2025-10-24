
import { getPage } from '../../global/fetch.ts'
import { findElement } from '../../utils/content.ts'
import { AnimationService } from '../../utils/AnimationService.ts'
import type { BlockOptions, PageGroup } from '../../global/utils.types'


export class BlockContact {
	private className: string = ''

	block: HTMLElement | null
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
		this.page = getPage(target)

		console.log('IS CONTACT')
	}

	public static init(options: BlockOptions) {
		const instance = new BlockContact(options)

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
		this.block.id = `block-${this.page.id}`
		this.block.dataset.position = String(this.index)
	}

	private style(): void {
		if (!this.block) return

		AnimationService.stagger(this.block, {
			className: 'block--disabled',
			index: this.index,
			stagger: .25,
			start: .5,
		})
	}
}
