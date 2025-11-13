import { findParentBlock } from '../../../../utils/index.ts'
import { ContentService } from '../../../../services/index.ts'
import { LightboxBlocks } from './Blocks.ts'
import { LightboxBlockClass } from '../../utils/index.ts'
import type { IContent } from '../types/interfaces'


export class LightboxContent
extends ContentService implements IContent {
	private process(fragment: HTMLElement | undefined): HTMLDivElement | undefined {
		if (!fragment) return undefined

		const container = document.createElement('div'),
			{ children } = fragment

		for (let i = 0; i < children.length; i++) {
			const block = LightboxBlocks.format(children[i] as HTMLElement)
			if (!block) continue

			const { firstElementChild } = block,
				lastIndex = children.length - 1

			if (i === lastIndex && !!firstElementChild)
				firstElementChild.classList.add(LightboxBlockClass.Animation)

			container.appendChild(block)
		}

		return container.childElementCount ? container : undefined
	}

	async render(target: HTMLElement | undefined): Promise<HTMLDivElement | undefined> {
		const data = await this.fetch(target)
		if (!data) return
		const { content } = data

		const imgSelector = '[data-sqsp-image-block-image-container]',
			imgBlock = findParentBlock(target?.querySelector(imgSelector))

		if (imgBlock) content.prepend(imgBlock.cloneNode(true))

		return this.process(content)
	}
}
