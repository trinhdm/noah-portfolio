import { getPage } from '../global/fetch.ts'
import { formatBlock } from '../pages/Portfolio/block/formatBlock.ts'
import type { PageGroup } from '../global/utils.types'


export class ContentService {
	private cache = new Map<string, HTMLElement>()

	constructor(private selector: string = '.fe-block') {}

	private extract(doc: Document, id: string) {
		const anchor = doc.getElementById(id),
			container = anchor?.closest('.content')?.querySelector('.fluid-engine')

		return container?.innerHTML?.trim() || undefined
	}

	async fetch({ id, url }: PageGroup): Promise<string | undefined> {
		const separator = url?.includes('?') ? '&' : '?',
			htmlURL = `${url}${separator}format=html`

		const response = await fetch(htmlURL)
		if (!response.ok) throw new Error('content not found')

		const html = await response.text(),
			doc = new DOMParser().parseFromString(html, 'text/html')

		return this.extract(doc, id)
	}

	private async retrieve(target: HTMLElement): Promise<string | undefined> {
		const page = getPage(target)

		if (!page) return
		return await this.fetch(page)
	}

	private async build(target: HTMLElement): Promise<HTMLDivElement | undefined> {
		const content = await this.retrieve(target)
		if (!content) return

		const container = document.createElement('div')
		const imgSelector = '[data-sqsp-image-block-image-container]',
			image = target?.querySelector(imgSelector)?.closest(this.selector)

		if (image) {
			// ;(image as HTMLElement).style.maxHeight = `${(video as HTMLElement).offsetHeight}px`
			container.prepend(image.cloneNode(true) as HTMLElement)
		}

		container.insertAdjacentHTML('beforeend', content)

		return container
	}

	private format(fragment: HTMLElement | undefined) {
		const container = document.createElement('div'),
			elements = (fragment as Element)?.querySelectorAll(this.selector)

		elements?.forEach(el => {
			const formatted = formatBlock(el as HTMLElement)
			if (formatted) container.appendChild(formatted)
		})

		return container.childNodes.length ? container : undefined
	}

	async load(target: HTMLElement | Node): Promise<HTMLElement | undefined> {
		const targetEl = target as HTMLElement,
			id = targetEl.dataset.id || targetEl.id

		if (this.cache.has(id)) return this.cache.get(id)

		const fragment = await this.build(targetEl)
		if (fragment) this.cache.set(id, fragment)

		return fragment ?? undefined
	}

	async prefetch(target: HTMLElement | Node): Promise<void> {
		const targetEl = target as HTMLElement,
			id = targetEl.dataset.id || targetEl.id

		if (this.cache.has(id)) return

		try {
			const fragment = await this.build(targetEl)
			if (fragment) this.cache.set(id, fragment)
		} catch (err) {
			console.warn(`Prefetch failed for ${id}:`, err)
		}
	}

	async render(target: HTMLElement | Node): Promise<HTMLElement | undefined> {
		const fragment = await this.load(target)
		return this.format(fragment)
	}
}
