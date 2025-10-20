
import { getPage } from '../../../global/fetch.ts'
import { findChildBy, wrapTrimEl } from '../../../global/utils.ts'
import { resetAttrs, setAnimation } from '../../../utils/css.ts'
import { findElement, setContent } from '../../../utils/content.ts'
import type { BlockOptions, PageGroup } from '../../../global/utils.types'


export class Block {
	private className: string = ''

	public block: HTMLElement | null
	public content: HTMLDivElement | undefined
	public index: number = 0
	public page: PageGroup = {
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

		// console.log('IS PORTFOLIO', target)
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

		const [type] = this.block.querySelector('.sqs-block')?.classList[1]?.split('-block') ?? 'base'

		this.block.classList.add(
			this.className,
			`${this.className}__${type}`,
			'block--disabled'
		)
		this.block.dataset.id = `block-${this.page.id}`
		this.block.dataset.position = String(this.index)
	}

	private style(): void {
		if (!this.block) return

		setAnimation(this.block, {
			index: this.index,
			// order: this.index + 1,
			stagger: .12,
		})

		resetAttrs({
			block: this.block,
			className: 'block--disabled',
		})
	}

	private set(content?: HTMLElement): void {
		const titleWrapper = content?.querySelector('[data-sqsp-text-block-content]') as HTMLElement | undefined

		if (!this.block || !titleWrapper) return

		const details = document.createElement('div'),
			title = findChildBy(titleWrapper, { tagName: 'strong' })

		if (!title) return

		let newTitle = title
		const formattedTitle = wrapTrimEl(title, 'span')

		if (formattedTitle) {
			newTitle = formattedTitle
			title.innerHTML = formattedTitle.innerHTML
		}

		details.classList.add(`${this.className}__details`)
		details.appendChild(newTitle)
		this.block.appendChild(details)
	}
}
