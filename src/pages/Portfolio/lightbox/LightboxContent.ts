import { fetchContent, getPage } from '../../../global/fetch.ts'
import { findChildBy, wrapTrimEl } from '../../../global/utils.ts'
import { findElement, setContent } from '../../../utils/content.ts'
import type { ArrowsGroup } from '../block/block.types'
import type { LightboxContentOptions } from './lightbox.types'
import type { PageGroup } from '../../../global/utils.types'


export class LightboxContent {
	block: HTMLElement | null = null
	content: HTMLDivElement | undefined
	navigation: ArrowsGroup
	page: PageGroup = {
		id: '',
		url: '',
	}

	constructor({
		elements,
		index = 0,
		page = {
			id: '',
			url: '',
		},
	}: LightboxContentOptions) {
		const current = elements[index]

		this.block = findElement(current)
		this.content = undefined
		this.page = page

		const next = index - 1,
			prev = index + 1

		this.navigation = {
			next: {
				index: next,
				target: elements[next],
			},
			prev: {
				index: prev,
				target: elements[prev],
			},
		}
	}

	static async retrieve(options: LightboxContentOptions) {
		const instance = new LightboxContent(options),
			content = await setContent(instance),
			navigation = await instance.setNavigation()

		instance.content = content
		instance.navigation = navigation

		return instance
	}

	private async setNavigation(
		navigation: ArrowsGroup = this.navigation
	): Promise<ArrowsGroup> {
		const directions = Object.keys(navigation) as (keyof ArrowsGroup)[]

		const entries = await Promise.all(
			directions.map(async (direction) => {
				const { target: rawTarget, ...rest } = navigation[direction]
				const target = findElement(rawTarget)
				let value = { ...rest, target }

				if (target) {
					const navWrapper = document.createElement('div'),
						newPage = getPage(target)

					navWrapper.innerHTML = await fetchContent(newPage) ?? ''

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
