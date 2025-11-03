import { findElement, getBlockType } from '../../utils'
import { BlockDispatcher } from './BlockDispatcher.ts'
import { ContentService, type HTMLTarget } from '../../services'
import { LightboxBlockClass, LightboxClass } from './constants.ts'


export class LightboxContentService extends ContentService {
	private readonly classPrefixes = [LightboxClass.Root, LightboxBlockClass.Root]

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

	private sanitize(fragment: HTMLElement): void {
		const attributes = Array.from(fragment.attributes)

		attributes.forEach(({ name, value }) => {
			if (name === 'class') {
				const classes = value.split(' ')
					.filter(cl => this.classPrefixes.some(c => cl.includes(c)))
					.join(' ')
				fragment.setAttribute(name, classes)
			} else {
				fragment.removeAttribute(name)
			}
		})
	}

	private process(fragment: HTMLTarget): HTMLDivElement | undefined {
		if (!fragment) return undefined

		const container = document.createElement('div'),
			elements = fragment.querySelectorAll(this.selector)

		for (const el of elements) {
			const block = BlockDispatcher.format(el as HTMLElement)
			if (!block) continue

			if (el === Array.from(elements).at(-1))
				block.firstElementChild?.classList.add(LightboxBlockClass.Animation)

			const type = getBlockType(block)
			if (type === 'image') this.sanitize(block)

			container.appendChild(block)
		}

		return !!container.childNodes.length ? container : undefined
	}

	async render(target: HTMLTarget): Promise<HTMLDivElement | undefined> {
		if (!target) return
		const fragment = await this.construct(target)
		return this.process(fragment)
	}
}
