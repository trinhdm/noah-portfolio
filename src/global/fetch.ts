import { findChildBy } from './utils.ts'
import type { PageGroup } from './utils.types'


export const getPage = (element: HTMLElement | null) => {
	let settings: PageGroup = { id: '', url: '' }

	const anchorLink = !!element
		? findChildBy(element, { tagName: 'a' })
		: undefined

	if (anchorLink) {
		const { hash, href } = anchorLink as HTMLAnchorElement,
			[url] = href.split('#'),
			id = hash.slice(1)

		settings = { id, url }
	}

	return settings
}


export const fetchContent = ({ id, url }: PageGroup) => {
	if (!id || !url) return

	const separator = url.includes('?') ? '&' : '?',
		htmlURL = `${url}${separator}format=html`

	return fetch(htmlURL)
		.then(response => {
			if (!response.ok)
				throw new Error('page not found')

			return response.text()
		}).then(html => {
			const parser = new DOMParser(),
				docu = parser.parseFromString(html, 'text/html')

			const anchor = docu.getElementById(id),
				container = anchor?.closest('.content')?.querySelector('.fluid-engine'),
				content = container?.innerHTML.trim()

			return !!content?.length
				? content
				: '<p>No content found.</p>'
		}).catch(err => console.error('error fetching page', err))
}
