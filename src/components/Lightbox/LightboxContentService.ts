import { getBlockType } from '../../utils'
import { BlockDispatcher } from './BlockDispatcher.ts'
import { ContentService } from '../../services'


export class LightboxContentService extends ContentService {
	private sanitize(image: HTMLElement | undefined) {
		if (!image) return

		const attributes = Array.from(image.attributes)

		attributes.forEach(({ name, value }) => {
			if (name === 'class') {
				const classes = value.split(' ')
					.filter(cl => ['fe-block', 'lightbox'].some(c => cl.includes(c)))
					.join(' ')
				image.setAttribute(name, classes)
			} else {
				image.removeAttribute(name)
			}
		})
	}

	private process(fragment: HTMLElement | undefined) {
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
			// if (type === 'image' || type === 'video')
			// 	mediaEls[type] = formatted

			container.appendChild(formatted)
		}

		// if (mediaEls.image && mediaEls.video) {
		// 	requestAnimationFrame(() => {
		// 		const videoHeight = mediaEls.video!.offsetHeight
		// 		if (videoHeight > 0)
		// 			mediaEls.image!.style.maxHeight = `${videoHeight}px`
		// 	})
		// }

		return container.childNodes.length ? container : undefined
	}

	async render(target: HTMLElement | Node): Promise<HTMLElement | undefined> {
		const fragment = await this.load(target)
		return this.process(fragment)
	}
}
