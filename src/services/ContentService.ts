import { findChildBy, isHeaderTag, wrapContent } from '../utils'


type PageGroup = {
	id: string
	url: string
}

export type PageDetails = PageGroup & {
	content: string | undefined
	title: HTMLElement | null
}

export type HTMLTarget = HTMLElement | null | undefined


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

	private extract(doc: Document, id: string): HTMLElement {
		const anchor = doc.getElementById(id),
			parent = anchor?.closest('.content')?.querySelector('.fluid-engine')

		return parent as HTMLElement || undefined
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

	private async retrieve(target: HTMLTarget, tag: string = 'strong'): Promise<PageDetails> {
		const page = this.parse(target),
			parent = await this.fetch(page)

		let content: string | undefined,
			title: HTMLElement | null = null

		if (parent) {
			const textEls = parent.querySelectorAll('[data-sqsp-text-block-content]')
			let titleEl = Array.from(textEls).find(
					el => !(isHeaderTag(el.firstElementChild!.tagName ?? ''))
				) as HTMLElement | null

			titleEl = findChildBy(titleEl, { tagName: 'strong' })

			if (titleEl) {
				const newTitleEl = wrapContent(titleEl, tag)
				titleEl.replaceWith(newTitleEl ?? '')
			}

			content = parent.innerHTML.trim()
			title = titleEl
		}

		return { ...page, content, title }
	}

	async load(t: HTMLTarget, tag?: string): Promise<PageDetails> {
		const base = { content: undefined } as PageDetails,
			target = t as HTMLElement,
			id = target.dataset.id || target.id

		if (this.cache.has(id)) return this.cache.get(id) ?? base

		const fragment = await this.retrieve(target, tag)
		if (fragment) this.cache.set(id, fragment)

		return fragment ?? base
	}

	async prefetch(t: HTMLTarget, tag?: string): Promise<void> {
		const target = t as HTMLElement,
			id = target.dataset.id || target.id

		if (this.cache.has(id)) return

		try {
			const fragment = await this.retrieve(target, tag)
			if (fragment) this.cache.set(id, fragment)
		} catch (err) { console.warn(`[ContentService] prefetch() failed for:`, id, err) }
	}

	async prefetcher(targets: HTMLTarget[], tag?: string) {
		const data = new WeakSet<HTMLElement>()

		for (const t of targets) {
			const target = t as HTMLElement

			if (!target || data.has(target)) continue
			data.add(target)

			try { await this.prefetch(target, tag) }
			catch (err) { console.warn(`[ContentService] prefetcher() failed on:`, target, err) }
			finally { data.delete(target) }
		}
	}
}
