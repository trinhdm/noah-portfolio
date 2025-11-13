import { LightboxSelector } from '../../../utils'
import type { ArrowDirections, ArrowGroup, LightboxOptions } from '../../../types'
import type { IContent, IMenu } from '../types/interfaces.d.ts'
import type { IDOM } from '../../presentation'
import type { OnlyRequired } from '../../../../../types/globals.types.d.ts'


export class LightboxMenu implements IMenu {
	private elements: LightboxOptions['elements'] = []

	constructor(
		protected dom: IDOM,
		protected content: IContent
	) {}

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
			dirs = Object.keys(adjacents) as ArrowDirections[]

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
			dirs = Object.keys(directory).reverse() as ArrowDirections[]

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
