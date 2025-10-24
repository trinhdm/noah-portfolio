
import { getPage } from '../../../global/fetch.ts'
import { findChildBy, wrapTrimEl } from '../../../global/utils.ts'
import { findElement, setContent } from '../../../utils/content.ts'
import { AnimationService } from '../../../utils/AnimationService.ts'
import type { BlockOptions, PageGroup } from '../../../global/utils.types'


export class Block {
	private readonly className: string
	public block: HTMLElement | null
	public content: HTMLDivElement | undefined
	public index: number
	public page: PageGroup

	constructor({
		className,
		index,
		target,
	}: BlockOptions) {
		this.className = className
		this.index = index
		this.block = findElement(target)
		this.page = getPage(target)
	}

	static async init(options: BlockOptions): Promise<Block> {
		const instance = new Block(options),
			content = await setContent(instance)
		await instance.generate(content)
		return instance
	}

	private async generate(content?: HTMLDivElement): Promise<void> {
		if (!this.block) return

		this.configureBlock()
		this.applyStyle()

		if (content) {
			this.renderDetails(content)
			this.content = content
		}
	}

	private configureBlock(): void {
		if (!this.block) return

		const type = this.block.querySelector('.sqs-block')
						?.classList[1]
						?.split('-block')[0] ?? 'base'

		this.block.classList.add(
			this.className,
			`${this.className}__${type}`,
			'block--disabled'
		)

		Object.assign(this.block.dataset, {
			id: `block-${this.page.id}`,
			position: String(this.index),
		})
	}

	private applyStyle(): void {
		if (!this.block) return

		AnimationService.stagger(this.block, {
			className: 'block--disabled',
			index: this.index,
			stagger: .12,
		})
	}

	private renderDetails(content?: HTMLElement): void {
		if (!this.block) return

		const titleWrapper = content?.querySelector('[data-sqsp-text-block-content]') as HTMLElement | undefined,
			title = findChildBy(titleWrapper, { tagName: 'strong' })

		if (!title) return

		let newTitle = title.cloneNode(true)
		const details = document.createElement('div'),
			formattedTitle = wrapTrimEl(title, 'span')

		if (formattedTitle) {
			newTitle = formattedTitle
			title.innerHTML = formattedTitle.innerHTML
		}

		details.classList.add(`${this.className}__details`)
		details.appendChild(newTitle)
		this.block.appendChild(details)
	}

	toLightboxOptions() {
		return {
			block: this.block,
			content: this.content,
			index: this.index,
			page: this.page,
		}
	}
}
