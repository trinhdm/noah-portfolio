import { getPage } from '../global/fetch.ts'
import { formatBlock } from '../pages/Portfolio/block/formatBlock.ts'
import type { PageGroup } from '../global/utils.types'


export class ContentService {
	private cache = new Map<string, HTMLElement>()

	constructor(private selector: string = '.fe-block') {}

	static async fetch({ id, url }: PageGroup): Promise<string | undefined> {
		const separator = url?.includes('?') ? '&' : '?',
			htmlURL = `${url}${separator}format=html`,
			messageErr = 'Content not found.'

		return fetch(htmlURL)
			.then(response => {
				if (!response.ok)
					throw new Error(messageErr)

				return response.text()
			}).then(html => {
				const parser = new DOMParser(),
					docu = parser.parseFromString(html, 'text/html')

				const anchor = docu.getElementById(id),
					container = anchor?.closest('.content')?.querySelector('.fluid-engine'),
					content = container?.innerHTML.trim()

				return !!content?.length
					? content
					: `<p>${messageErr}</p>`
			}).catch(err => {
				console.error(messageErr, err)
			}) as Promise<string | undefined>
	}

	private async get(target: HTMLElement | null): Promise<string | undefined> {
		const page = getPage(target)

		if (!page) return undefined
		return await ContentService.fetch(page)
	}

	private async set(target: HTMLElement | null): Promise<HTMLDivElement | undefined> {
		try {
			const content = await this.get(target)
			if (typeof content !== 'string') return

			const container = document.createElement('div')
			const imageWrapper = target
				?.querySelector('[data-sqsp-image-block-image-container]')
				?.closest(this.selector)

			if (imageWrapper)
				container.prepend(imageWrapper.cloneNode(true) as HTMLElement)

			container.innerHTML += content

			return container
		} catch(err) { console.error(err) }
	}

	static async load(target: HTMLElement): Promise<HTMLElement | undefined> {
		const id = target.dataset.id || target.id || '',
			instance = new ContentService()

		if (instance.cache.has(id)) return instance.cache.get(id)

		const fragment = await instance.set(target)
		if (fragment) instance.cache.set(id, fragment)

		return fragment ?? undefined
	}

	static async prefetch(target: HTMLElement): Promise<void> {
		const id = target.dataset.id || target.id || '',
			instance = new ContentService()
		if (instance.cache.has(id)) return

		try {
			const fragment = await instance.set(target)
			if (fragment) instance.cache.set(id, fragment)
		} catch (err) {
			console.warn(`Prefetch failed for ${id}:`, err)
		}
	}

	static async format(
		fragment: HTMLElement | undefined,
		id: string,
	): Promise<void> {
		const instance = new ContentService(),
			elements = fragment?.querySelectorAll(instance.selector)

		elements?.forEach(el => formatBlock(el as HTMLElement, id))
	}

	static async render(target: HTMLElement): Promise<HTMLElement | undefined> {
		const fragment = await ContentService.load(target)
		await ContentService.format(fragment, target.id)

		return fragment
	}
}
