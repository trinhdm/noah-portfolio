import { findElement } from '../../../../../utils'
import { ContentService } from '../../../../../services'
import { LightboxBlocks } from './Blocks.ts'
import { LightboxBlockClass } from '../../../utils'
import type { IContent } from '../types/interfaces.d.ts'


export class LightboxContent
	extends ContentService implements IContent {
	private async construct(target: HTMLElement): Promise<HTMLDivElement | undefined> {
		const data = await this.fetch(target)
		if (!data) return

		const container = document.createElement('div'),
			{ content } = data

		container.insertAdjacentHTML('beforeend', content)

		const imgSelector = '[data-sqsp-image-block-image-container]',
			imgBlock = findElement(target.querySelector(imgSelector))

		if (imgBlock) container.prepend(imgBlock.cloneNode(true))

		return container
	}

	private process(fragment: HTMLDivElement | undefined): HTMLDivElement | undefined {
		if (!fragment) return undefined

		const container = document.createElement('div'),
			elements = fragment.querySelectorAll(this.selector) as NodeListOf<HTMLElement>

		for (let i = 0; i < elements.length; i++) {
			const el = elements[i],
				block = LightboxBlocks.format(el)

			if (!block) continue

			const { firstElementChild } = block,
				lastIndex = elements.length - 1

			if (i === lastIndex && !!firstElementChild)
				firstElementChild.classList.add(LightboxBlockClass.Animation)

			container.appendChild(block)
		}

		return container.childElementCount ? container : undefined
	}

	async render(target: HTMLElement | undefined): Promise<HTMLDivElement | undefined> {
		if (!target) return
		const fragment = await this.construct(target)
		return this.process(fragment)
	}
}
