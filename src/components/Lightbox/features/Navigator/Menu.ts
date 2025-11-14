import { LightboxSelector } from '@lightbox/utils'
import type { ArrowGroup, LightboxOptions } from '@lightbox/types'
import type { IContent, IMenu } from '@features/types/interfaces'
import type { IDOM } from '@interface'
import type { OnlyRequired } from '../../../../types/globals.types'


interface NavigatorContext {
	content: IContent
	dom: IDOM
}


export class LightboxMenu implements IMenu {
	protected readonly content: IContent
	protected readonly dom: IDOM
	private elements: LightboxOptions['elements'] = []

	constructor(protected ctx: NavigatorContext) {
		this.content = ctx.content
		this.dom = ctx.dom
	}

	async configure({ elements, index }: OnlyRequired<LightboxOptions, 'index'>): Promise<ArrowGroup> {
		if (elements?.length) this.elements = elements

		const directory = await this.getDirectory(index)
		this.setArrows(directory)

		return directory
	}

	private findAdjacent(index: number): ArrowGroup {
		const max = this.elements.length,
			next = index + 1 < max ? index + 1 : 0,
			prev = index - 1 >= 0 ? index - 1 : max - 1

		return {
			next: { index: next, target: this.elements[next] },
			prev: { index: prev, target: this.elements[prev] },
		} as ArrowGroup
	}

	private async getDirectory(index: number): Promise<ArrowGroup> {
		const adjacents = this.findAdjacent(index),
			directory = {} as ArrowGroup,
			dirs = Object.keys(adjacents) as (keyof ArrowGroup)[]

		await Promise.all(
			dirs.map(async dir => {
				const adj = adjacents[dir],
					details = await (adj.target ? this.content.fetch(adj.target) : {})
				directory[dir] = Object.assign({}, adj, details)
			})
		)

		return directory
	}

	private setArrows(directory: ArrowGroup): void {
		const arrows = this.dom.get('arrows'),
			dirs = Object.keys(directory).reverse() as (keyof ArrowGroup)[]

		for (const dir of dirs) {
			const arrow = arrows.find(({ dataset }) => dataset.direction === dir),
				{ index, title } = directory[dir]

			if (!arrow || !title) continue

			const label = arrow.querySelector(LightboxSelector.Label),
				text = title.innerText ?? ''

			if (label) label.replaceChildren(text)
			arrow.setAttribute('data-position', `${index}`)
		}
	}
}
