import { findElement } from '../../utils'
import { AnimationService } from '../../services'
import type { BlockOptions } from '../../types'


export class BlockAbout {
	private readonly className: string

	block: HTMLElement | null
	index: number = 0

	constructor({
		className,
		index,
		target,
	}: BlockOptions) {
		this.className = className
		this.index = index
		this.block = findElement(target)

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
			`${this.className}__${type}`
		)
	}

	private style(): void {
		if (!this.block) return

		AnimationService.set(this.block, {
			delay: .875,
			index: this.index,
			stagger: .5,
		})
	}
}
