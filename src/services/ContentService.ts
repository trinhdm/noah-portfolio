import { findChildBy, wrapContent } from '../utils'
import { BlockDispatcher } from './BlockDispatcher.ts'


type PageGroup = {
	id: string
	url: string
}


export class ContentService {
	private cache = new Map<string, HTMLElement>()

	constructor(private selector: string = '.fe-block') {}

	async retrieve(target: HTMLElement): Promise<PageGroup & {
		content: string | undefined
		title: string | undefined
	}> {
		const page = this.parse(target),
			element = await this.fetch(page)
		let content, title

		if (element) {
			const textEls = element.querySelectorAll('[data-sqsp-text-block-content]')
			let titleEl = [...textEls].find(
					el => !(/^H[1-4]$/.test(el.firstElementChild!.tagName))
				) as HTMLElement | null

			titleEl = findChildBy(titleEl, { tagName: 'strong' })

			if (titleEl) {
				const newTitleEl = wrapContent(titleEl, 'strong')
				titleEl.replaceWith(newTitleEl ?? '')
			}

			content = element.innerHTML.trim()
			title = titleEl?.innerText
		}

		return { ...page, content, title }
	}

	private parse(target: HTMLElement): PageGroup {
		const anchor = target ? findChildBy(target, { tagName: 'a' }) : null
		let id = '', url = ''

		if (anchor) {
			const { hash, href } = anchor as HTMLAnchorElement
			const [link] = href?.split('#'),
				separator = link?.includes('?') ? '&' : '?'

			id = hash.slice(1)
			url = `${link}${separator}format=html`
		}

		return { id, url }
	}

	private extract(doc: Document, id: string): HTMLElement {
		const anchor = doc.getElementById(id),
			container = anchor?.closest('.content')?.querySelector('.fluid-engine')

		return container as HTMLElement || undefined
	}

	private async fetch(page: PageGroup): Promise<HTMLElement | undefined> {
		const { id, url } = page

		try {
			const response = await fetch(url)
			if (!response.ok) throw new Error('content not found')

			const html = await response.text(),
				doc = new DOMParser().parseFromString(html, 'text/html')

			return this.extract(doc, id)
		} catch (err) {
			console.error(`[ContentService] fetch() failed for ${url}`, err)
			return undefined
		}
	}

	private async construct(target: HTMLElement, hasImage: boolean = true): Promise<HTMLDivElement | undefined> {
		const { content } = await this.retrieve(target)
		if (!content) return

		const container = document.createElement('div')
		container.insertAdjacentHTML('beforeend', content)

		if (hasImage) {
			const imgSelector = '[data-sqsp-image-block-image-container]',
				image = target?.querySelector(imgSelector)?.closest(this.selector)

			if (image)
				container.prepend(image.cloneNode(true) as HTMLElement)
		}

		return container
	}

	async load(target: HTMLElement | Node): Promise<HTMLElement | undefined> {
		const targetEl = target as HTMLElement,
			id = targetEl.dataset.id || targetEl.id

		if (this.cache.has(id)) return this.cache.get(id)

		const fragment = await this.construct(targetEl)
		if (fragment) this.cache.set(id, fragment)

		return fragment ?? undefined
	}

	async prefetch(target: HTMLElement | Node): Promise<void> {
		const targetEl = target as HTMLElement,
			id = targetEl.dataset.id || targetEl.id

		if (this.cache.has(id)) return

		try {
			const fragment = await this.construct(targetEl)
			if (fragment) this.cache.set(id, fragment)
		} catch (err) {
			console.warn(`prefetch failed for ${id}:`, err)
		}
	}

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

	private format(fragment: HTMLElement | undefined) {
		if (!fragment) return undefined

		const container = document.createElement('div'),
			elements = fragment.querySelectorAll(this.selector)

		const mediaEls: Partial<Record<'image' | 'video', HTMLElement>> = {}

		for (const el of elements) {
			const formatted = BlockDispatcher.format(el as HTMLElement)
			if (!formatted) continue

			const type = BlockDispatcher.getType(formatted)

			if (type === 'image' || type === 'video')
				mediaEls[type] = formatted
			if (type === 'image')
				this.sanitize(formatted)

			container.appendChild(formatted)
		}

		if (mediaEls.image && mediaEls.video) {
			requestAnimationFrame(() => {
				const videoHeight = mediaEls.video!.offsetHeight
				if (videoHeight > 0)
					mediaEls.image!.style.maxHeight = `${videoHeight}px`
			})
		}

		return container.childNodes.length ? container : undefined
	}

	async render(target: HTMLElement | Node): Promise<HTMLElement | undefined> {
		const fragment = await this.load(target)
		return this.format(fragment)
	}
}
