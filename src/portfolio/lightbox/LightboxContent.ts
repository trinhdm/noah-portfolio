
import { fetchContent, getPage } from '../../global/fetch.ts'
import { findChildBy, wrapTrimEl } from '../../global/utils.ts'
import { formatBlock } from '../block/formatBlock.ts'
import type { ArrowsGroup } from '../block/block.types'
import type { PageGroup } from '../../global/utils.types'


type LightboxOptions = {
	elements: NodeListOf<HTMLElement>
	index: number
}

export class LightboxContent {
	private selector: string = '.fe-block'

	block: HTMLElement | null
	content: HTMLDivElement | undefined
	navigation: ArrowsGroup
	page: PageGroup = {
		id: '',
		url: '',
	}

	constructor({
		elements,
		index,
	}: LightboxOptions) {
		const target = elements[index]

		this.page = getPage(target)
		this.block = this.get(target)

		this.content = undefined

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

	static async retrieve(options: LightboxOptions) {
		const instance = new LightboxContent(options),
			content = await instance.setContent(),
			navigation = await instance.setNavigation()

		instance.content = content
		instance.navigation = navigation
		instance.page = instance.page

		return instance
	}

	private get(target: HTMLElement | null): HTMLElement | null {
		if (!target)
			return null

		else if (target.classList.contains(this.selector))
			return target

		return target.closest(this.selector)
	}

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

		const imageWrapper: HTMLElement | null = (this.block
			?.querySelector('[data-sqsp-image-block-image-container]')
			?.closest(this.selector)) ?? null
		const temp: HTMLDivElement | undefined = document.createElement('div')

		if (imageWrapper && !temp.contains(imageWrapper)) {
			const imageCopy = imageWrapper?.cloneNode(true) as HTMLElement ?? null
			temp.prepend(imageCopy!)
		}

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
}
