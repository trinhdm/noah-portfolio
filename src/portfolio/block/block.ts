
import { fetchContent, getPage } from '../../global/fetch.ts'
import { findChildBy, getDeepestChild, tidyContent, wrapTrimEl } from '../../global/utils.ts'
import { formatBlock } from '../../utils/formatBlock.ts'
import { Lightbox } from '../lightbox'
import type { ArrowsGroup, BlockOptions } from './block.types'
import type { PageGroup } from '../../global/utils.types'


export class Block {
	private className: string = ''
	private index: number = 0
	private selector: string = '.fe-block'
	private page: PageGroup = {
		id: '',
		url: '',
	}

	block: HTMLElement | null
	clonedBlock: HTMLElement | null
	content: HTMLDivElement | undefined
	navigation: ArrowsGroup

	constructor({
		className,
		navigation,
	}: BlockOptions) {
		const { current, ...rest } = navigation
		const { index, target } = current

		this.index = index
		this.page = getPage(target)

		this.block = this.get(target)
		this.clonedBlock = this.block?.cloneNode(true) as HTMLElement ?? null

		this.content = undefined
		this.className = className
		this.navigation = rest
	}

	public static async init(options: BlockOptions) {
		const instance = new Block(options),
			content = await instance.setContent()

		instance.configure(content)
		instance.content = content
		instance.navigation = await instance.setNavigation()
		instance.bindEvents()

		return instance
	}

	private get(target: HTMLElement | null): HTMLElement | null {
		if (!target)
			return null

		else if (target.classList.contains(this.selector))
			return target

		return target.closest(this.selector)
	}

	private configure(content?: HTMLElement): void {
		if (!this.block) return

		this.block.classList.add(this.className)
		this.block.id = `block-${this.page.id}`
		this.block.dataset.position = String(this.index)

		this.append(content)
		this.style(this.block)
	}

	private append(content?: HTMLElement): void {
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

	private style(block: HTMLElement | undefined): void {
		if (!block) return

		const styles = {
			animationDelay: `${0.075 * this.index + 0.75}s`,
			order: this.index + 1,
		}

		Object.assign(block.style, styles)

		const image = findChildBy(block, { tagName: 'img' })

		if (image)
			image.classList.add(`${this.className}__image`)
	}

	private async fetch(
		page: PageGroup = this.page
	): Promise<string> {
		console.log('FETCH', { options: { current: this.page, page }})
		const content = await fetchContent(page)
		return content ?? ''
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

	private async setNavigation(
		navigation: ArrowsGroup = this.navigation
	): Promise<ArrowsGroup> {
		const directions = Object.keys(navigation) as (keyof ArrowsGroup)[]

		const entries = await Promise.all(
			directions.map(async (direction) => {
				const { target: rawTarget, ...rest } = navigation[direction]
				const target = this.get(rawTarget)

				let value = { ...rest, target }

				if (target) {
					const navWrapper = document.createElement('div')
					navWrapper.innerHTML = await this.fetch(getPage(target))

					const title = findChildBy(navWrapper, { tagName: 'strong' }),
						text = wrapTrimEl(title, 'span') ?? document.createElement('span')

					value = { ...value, target, text }
				}

				return [direction, value] as const
			})
		)

		return Object.fromEntries(entries) as ArrowsGroup
	}

	private async bindEvents(): Promise<void> {
		if (!this.block) return

		this.block.addEventListener('click', async event => {
			event.preventDefault()

			console.log('nav', this.navigation)

			const lightbox = new Lightbox({
				content: this.content,
				navigation: this.navigation,
				properties: { id: `lightbox-${this.page.id}` },
			})

			lightbox.open()
		})
	}

	/** Static: Apply typography styles globally to all non-portfolio blocks */
	public static styleAll(): void {
		const items = document.querySelectorAll('.fe-block:not(.portfolio-block)')

		items.forEach(item => {
			const [deepest] = getDeepestChild(item)
			const { textContent } = deepest ?? { textContent: '' }

			if (!textContent || !textContent.includes(' ')) return

			deepest.classList.add('portfolio-block__header')
			deepest.textContent = ''

			textContent.split(' ')
				.map(str => tidyContent(str, 'span'))
				.filter(Boolean)
				.forEach(el => deepest.appendChild(el!))
		})
	}
}
