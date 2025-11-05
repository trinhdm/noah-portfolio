import { findChildBy, isHeaderTag, trimContent } from '../utils'
import type { PageDetails, PageGroup } from '../types'


export class ContentService {
	private cache = new Map<string, PageDetails>()
	selector: string

	constructor(selector: string = '.fe-block') {
		this.selector = selector
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

	private async load(target: HTMLElement | undefined): Promise<PageGroup & { parent: HTMLElement } | undefined> {
		const { id, url } = this.buildURL(target)

		try {
			const response = await fetch(url)
			if (!response.ok) throw new Error('content not found')

			const html = await response.text(),
				parent = this.parseHTML(html, id)

			if (!parent) throw new Error('element not found')
			return { id, url, parent }
		} catch (err) {
			console.error(`[ContentService] fetch() failed for ${url}`, err)
			return undefined
		}
	}

	private async retrieve(target: HTMLElement | undefined): Promise<PageDetails | undefined> {
		const data = await this.load(target)
		if (!data) return

		const { parent, ...page } = data

		const wrappers = parent.querySelectorAll('[data-sqsp-text-block-content]'),
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
			content: parent.innerHTML.trim(),
			title,
		} as PageDetails
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
		const pfCache = new WeakSet<HTMLElement>()

		await Promise.allSettled(
			targets.map(async target => {
				if (!target || pfCache.has(target)) return
				pfCache.add(target)

				await this.prefetch(target)
				pfCache.delete(target)
			})
		)
	}
}
