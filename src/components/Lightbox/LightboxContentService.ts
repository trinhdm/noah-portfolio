import { findElement } from '../../utils'
import { BlockDispatcher } from './BlockDispatcher.ts'
import { ContentService } from '../../services'
import { LightboxBlockClass } from './constants.ts'
import type { HTMLTarget } from '../../types'


export class LightboxContentService extends ContentService {
	private async construct(target: HTMLElement): Promise<HTMLDivElement | undefined> {
		const { content } = await this.load(target)
		if (!content) return

		const container = document.createElement('div')
		container.insertAdjacentHTML('beforeend', content)

		const imgSelector = '[data-sqsp-image-block-image-container]',
			imgBlock = findElement(target.querySelector(imgSelector))

		if (imgBlock) container.prepend(imgBlock.cloneNode(true))

		return container
	}

	private process(fragment: HTMLTarget): HTMLDivElement | undefined {
		if (!fragment) return undefined

		const container = document.createElement('div'),
			elements = fragment.querySelectorAll(this.selector)

		for (const el of elements) {
			const block = BlockDispatcher.format(el as HTMLElement)
			if (!block) continue

			if (el === Array.from(elements).at(-1) && !!block.firstElementChild)
				block.firstElementChild.classList.add(LightboxBlockClass.Animation)

			container.appendChild(block)
		}

		return !!container.children.length ? container : undefined
	}

	async render(target: HTMLTarget): Promise<HTMLDivElement | undefined> {
		if (!target) return
		const fragment = await this.construct(target)
		return this.process(fragment)
	}
}
