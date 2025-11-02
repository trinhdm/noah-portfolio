import {
	findChildBy,
	findElement,
	isHeaderTag,
	wrapContent,
} from '../utils'


type PageGroup = {
	id: string
	url: string
}


export class ContentService {
	private cache = new Map<string, HTMLElement>()
	selector: string

	constructor(selector: string = '.fe-block') {
		this.selector = selector
	}

	async retrieve(element: HTMLElement): Promise<PageGroup & {
		content: string | undefined
		title: string | undefined
	}> {
		let content, title
		const target = element.classList.contains(this.selector)
			? element
			: findElement(element, this.selector) ?? element

		const page = this.parse(target),
			html = await this.fetch(page)

		if (html) {
			const textEls = html.querySelectorAll('[data-sqsp-text-block-content]'),
				tagName = 'strong'
			let titleEl = [...textEls].find(
					el => !(isHeaderTag(el.firstElementChild!.tagName))
				) as HTMLElement | null

			content = html.innerHTML.trim()
			titleEl = findChildBy(titleEl, { tagName })

			if (titleEl) {
				const newTitleEl = wrapContent(titleEl, tagName)
				titleEl.replaceWith(newTitleEl ?? '')
				title = titleEl.innerText
			}
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

	private async construct(element: HTMLElement, hasImage: boolean = true): Promise<HTMLDivElement | undefined> {
		const target = element.classList.contains(this.selector)
			? element
			: findElement(element, this.selector) ?? element

		const { content } = await this.retrieve(target)
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

	async load(t: HTMLElement | Node): Promise<HTMLElement | undefined> {
		const target = t as HTMLElement,
			id = target.dataset.id || target.id

		if (this.cache.has(id)) return this.cache.get(id)

		const fragment = await this.construct(target)
		if (fragment) this.cache.set(id, fragment)

		return fragment ?? undefined
	}

	async prefetch(t: HTMLElement | Node): Promise<void> {
		const target = t as HTMLElement,
			id = target.dataset.id || target.id

		if (this.cache.has(id)) return

		try {
			const fragment = await this.construct(target)
			if (fragment) this.cache.set(id, fragment)
		} catch (err) { console.warn(`[ContentService] prefetch() failed for:`, id, err) }
	}

	async prefetcher(targets: (HTMLElement | Node | null | undefined)[]) {
		const data = new WeakSet<HTMLElement>()

		for (const t of targets) {
			const target = t as HTMLElement

			if (!target || data.has(target)) continue
			data.add(target)

			try { await this.prefetch(target) }
			catch (err) { console.warn(`[ContentService] prefetcher() failed on:`, target, err) }
			finally { data.delete(target) }
		}
	}
}
