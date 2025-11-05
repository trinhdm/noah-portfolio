import { findChildBy, isHeaderTag, trimContent } from '../utils'
import type { HTMLTarget, PageDetails, PageGroup } from '../types'


export class ContentService {
	private cache = new Map<string, PageDetails>()
	selector: string

	constructor(selector: string = '.fe-block') {
		this.selector = selector
	}

	private parse(target: HTMLTarget): PageGroup {
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

	private extract(html: string, id: string): HTMLTarget {
		const doc = new DOMParser().parseFromString(html, 'text/html'),
			anchor = doc.getElementById(id)

		if (!anchor) return
		const parent = anchor.closest('.content')?.querySelector('.fluid-engine')

		return parent as HTMLElement || undefined
	}

	private async fetch(target: HTMLTarget): Promise<{ page: PageGroup, parent: HTMLElement } | undefined> {
		const page = this.parse(target)
		const { id, url } = page

		try {
			const response = await fetch(url)
			if (!response.ok) throw new Error('content not found')

			const html = await response.text(),
				parent = this.extract(html, id)

			if (!parent) throw new Error('element not found')
			return { page, parent }
		} catch (err) {
			console.error(`[ContentService] fetch() failed for ${url}`, err)
			return undefined
		}
	}

	private async retrieve(target: HTMLTarget): Promise<PageDetails | undefined> {
		const data = await this.fetch(target)
		if (!data) return

		const { page, parent } = data

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

	async load(target: HTMLTarget): Promise<PageDetails> {
		const base = { content: undefined } as PageDetails,
			id = target?.dataset.id || target?.id || ''

		if (this.cache.has(id)) return this.cache.get(id) ?? base

		const fragment = await this.retrieve(target)
		if (fragment) this.cache.set(id, fragment)

		return fragment ?? base
	}

	async prefetch(target: HTMLTarget): Promise<void> {
		const id = target?.dataset.id || target?.id || ''
		if (this.cache.has(id)) return

		const fragment = await this.load(target)
		if (fragment) this.cache.set(id, fragment)
	}

	async prefetcher(targets: HTMLTarget[]) {
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
