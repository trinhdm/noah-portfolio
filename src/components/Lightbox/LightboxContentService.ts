import { getBlockType } from '../../utils'
import { BlockDispatcher } from './BlockDispatcher.ts'
import { ContentService, HTMLTarget } from '../../services'


export class LightboxContentService extends ContentService {
	private async construct(
		target: HTMLElement,
		hasImage: boolean = true
	): Promise<HTMLDivElement | undefined> {
		const { content } = await this.load(target)
		if (!content) return

		const container = document.createElement('div')
		container.insertAdjacentHTML('beforeend', content)

		if (hasImage) {
			const imgSelector = '[data-sqsp-image-block-image-container]',
				image = target?.querySelector(imgSelector)?.closest(this.selector)

			if (image) container.prepend(image.cloneNode(true) as HTMLElement)
		}

		return container
	}

	private sanitize(fragment: HTMLElement) {
		const attributes = Array.from(fragment.attributes)

		attributes.forEach(({ name, value }) => {
			if (name === 'class') {
				const classes = value.split(' ')
					.filter(cl => ['fe-block', 'lightbox'].some(c => cl.includes(c)))
					.join(' ')
				fragment.setAttribute(name, classes)
			} else {
				fragment.removeAttribute(name)
			}
		})
	}

	private process(fragment: HTMLTarget) {
		if (!fragment) return undefined

		const container = document.createElement('div'),
			elements = fragment.querySelectorAll(this.selector)

		// const mediaEls: Partial<Record<'image' | 'video', HTMLElement>> = {}

		for (const el of elements) {
			const formatted = BlockDispatcher.format(el as HTMLElement)
			if (!formatted) continue

			if (el === [...elements].at(-1))
				formatted.querySelector(':first-child')?.classList.add('block--animated')

			const type = getBlockType(formatted)
			if (type === 'image') this.sanitize(formatted)

			container.appendChild(formatted)

			// if (type === 'image' || type === 'video')
			// 	mediaEls[type] = formatted
		}

		// if (mediaEls.image && mediaEls.video) {
		// 	requestAnimationFrame(() => {
		// 		const videoHeight = mediaEls.video!.offsetHeight
		// 		if (videoHeight > 0)
		// 			mediaEls.image!.style.maxHeight = `${videoHeight}px`
		// 	})
		// }

		return !!container.childNodes.length ? container : undefined
	}

	async render(target: HTMLTarget): Promise<HTMLTarget> {
		if (!target) return
		const fragment = await this.construct(target)
		return this.process(fragment)
	}
}
