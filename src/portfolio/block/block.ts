
import { fetchContent, getPage } from '../../global/fetch.ts'
import { findChildBy, wrapTrimEl } from '../../global/utils.ts'
import { formatBlock } from './formatBlock.ts'
import { Lightbox } from '../lightbox/index.ts'
import type { ArrowsGroup, BlockOptions } from './block.types'
import type { PageGroup } from '../../global/utils.types'
// import { resetBlock, setAnimation } from '../../utils/css.ts'


export class Block {
	private clonedBlock: HTMLElement | null
	private className: string = ''
	private selector: string = '.fe-block'

	block: HTMLElement | null
	content: HTMLDivElement | undefined
	index: number = 0
	lightbox: Lightbox | undefined
	navigation: ArrowsGroup
	page: PageGroup = {
		id: '',
		url: '',
	}

	constructor({
		className,
		elements,
		index,
	}: BlockOptions) {
		const target = elements[index]

		this.index = index
		this.page = getPage(target)
		this.block = this.get(target)
		this.clonedBlock = this.block?.cloneNode(true) as HTMLElement ?? null

		this.content = undefined
		this.className = className

		this.lightbox = undefined
		this.navigation = {
			next: {
				index: index + 1,
				target: elements[index + 1],
			},
			prev: {
				index: index - 1,
				target: elements[index - 1],
			},
		}
	}

	public static async init(options: BlockOptions) {
		const instance = new Block(options),
			content = await instance.setContent()

		instance.configure()
		// instance.set(content)
		instance.content = content
		instance.navigation = await instance.setNavigation()
		instance.lightbox = await instance.createLightbox()
		// instance.handleLightbox()

		return instance
	}

	private get(target: HTMLElement | null): HTMLElement | null {
		if (!target)
			return null

		else if (target.classList.contains(this.selector))
			return target

		return target.closest(this.selector)
	}

	private configure(): void {
		if (!this.block) return

		this.block.classList.add(this.className, `${this.className}--disabled`)
		this.block.id = `block-${this.page.id}`
		this.block.dataset.position = String(this.index)
	}

	// private set(content?: HTMLElement): void {
	// 	if (!this.block) return

	// 	// this.append(content)
	// 	// this.style(this.block)
	// }

	// private append(content?: HTMLElement): void {
	// 	const titleWrapper = content?.querySelector('[data-sqsp-text-block-content]') as HTMLElement | undefined

	// 	if (titleWrapper) {
	// 		const details = document.createElement('div'),
	// 			title = findChildBy(titleWrapper, { tagName: 'strong' })

	// 		if (!title) return

	// 		const newTitle = wrapTrimEl(title, 'span')

	// 		details.classList.add(`${this.className}__details`)
	// 		details.appendChild(newTitle ?? title)

	// 		this.block?.appendChild(details)
	// 	}
	// }

	// private style(block: HTMLElement | undefined): void {
	// 	if (!block) return

	// 	const argsAnimate = {
	// 		duration: .875,
	// 		index: this.index,
	// 		stagger: .15,
	// 	}

	// 	Object.assign(block.style, {
	// 		...setAnimation(argsAnimate),
	// 		order: this.index + 1,
	// 	})

	// 	const image = findChildBy(block, { tagName: 'img' })

	// 	if (image)
	// 		image.classList.add(`${this.className}__image`)

	// 	resetBlock({
	// 		block,
	// 		className: `${this.className}--disabled`,
	// 		timeout: 300,
	// 	})
	// }

	private async fetch(
		page: PageGroup = this.page
	): Promise<string> {
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
					const navWrapper = document.createElement('div'),
						newPage = getPage(target)

					navWrapper.innerHTML = await this.fetch(newPage)

					const title = findChildBy(navWrapper, { tagName: 'strong' }),
						text = wrapTrimEl(title, 'span') ?? document.createElement('span')

					value = { ...value, target, text }
				}

				return [direction, value] as const
			})
		)

		return Object.fromEntries(entries) as ArrowsGroup
	}

	public async createLightbox(): Promise<Lightbox> {
		const lightbox = new Lightbox({
			content: this.content,
			navigation: this.navigation,
			properties: { id: `lightbox-${this.page.id}` },
		})

		lightbox.open()
		this.lightbox = lightbox

		return lightbox
	}

	public async closeLightbox(): Promise<void> {
		if (this.lightbox)
			this.lightbox.close()
	}

	public async handleLightbox(): Promise<void> {
		if (!this.block) return

		this.block.addEventListener('click', async event => {
			event.preventDefault()

			if (this.lightbox)
				this.lightbox.open()
		})
	}
}
