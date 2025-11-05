import { findChildBy, isHeaderTag, trimContent } from '../utils'
import type { PageDetails, PageGroup } from '../types'


export class ContentService {
	private cache = new Map<string, PageDetails>()
	selector: string

	constructor(selector: string = '.fe-block') {
		this.selector = selector
	}

	async fetch(target: HTMLElement | undefined): Promise<PageDetails | undefined> {
		const id = this.getID(target)

		if (this.cache.has(id)) return this.cache.get(id)

		const fragment = await this.retrieve(target)
		if (fragment) this.cache.set(id, fragment)

		return fragment ?? undefined
	}

	async prefetch(target: HTMLElement | undefined): Promise<void> {
		const id = this.getID(target)
		if (!id || this.cache.has(id)) return
		await this.fetch(target)
	}

	async prefetcher(targets: (HTMLElement | undefined)[]) {
		if (!targets.length) return

		const unique = new Set<HTMLElement>(targets.filter(Boolean) as HTMLElement[])
		await Promise.all([...unique].map(target => this.prefetch(target)))
	}

	private getID(target?: HTMLElement): string {
		return (target?.dataset.id || target?.id || '').toString()
	}

	private buildURL(target: HTMLElement | undefined): PageGroup {
		const anchor = target ? findChildBy(target, { tagName: 'a' }) : null

		if (!anchor) return { id: '', url: '' }

		const { hash, href } = anchor as HTMLAnchorElement
		const [link] = href?.split('#'),
			separator = link?.includes('?') ? '&' : '?'

		return {
			id: hash.slice(1),
			url: `${link}${separator}format=html`,
		}
	}

	private parseHTML(html: string, id: string): HTMLElement | undefined {
		const doc = new DOMParser().parseFromString(html, 'text/html'),
			anchor = doc.getElementById(id)

		if (!anchor) return
		const parent = anchor.closest('.content')?.querySelector('.fluid-engine')

		return parent as HTMLElement || undefined
	}

	private async load(page: PageGroup): Promise<HTMLElement | undefined> {
		const { id, url } = page

		try {
			const response = await fetch(url)
			if (!response.ok) throw new Error('content not found')

			const html = await response.text(),
				parent = this.parseHTML(html, id)

			if (!parent) throw new Error('element not found')
			return parent
		} catch (err) {
			console.error(`[ContentService] fetch() failed for ${url}`, err)
			return undefined
		}
	}

	private async retrieve(target: HTMLElement | undefined): Promise<PageDetails | undefined> {
		const page = this.buildURL(target),
			content = await this.load(page)

		if (!content) return

		const wrappers = content.querySelectorAll('[data-sqsp-text-block-content]'),
			textWrapper = (Array.from(wrappers) as HTMLElement[]).find(el =>
				isHeaderTag(el.firstElementChild!.tagName ?? '') === false)

		if (!textWrapper) return

		const textEl = findChildBy(textWrapper, { tagName: 'strong' }),
			title = trimContent(textEl)

		if (textEl && title) {
			title.dataset.title = ''
			textEl.replaceWith(title)
		}

		return {
			...page,
			content: content.innerHTML.trim(),
			title,
		} as PageDetails
	}
}
