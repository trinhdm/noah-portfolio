import { findChildBy } from './utils.ts'

export const getPage = ({ target }: { target: HTMLElement }) => {
	const linkEl = findChildBy(target, { tagName: 'a' })

	if (!linkEl)
		return { id: undefined, url: undefined }

	const { hash, href } = linkEl as HTMLAnchorElement,
		[url] = href.split('#'),
		id = hash.slice(1)

	return { id, url }
}


export const fetchContent = (url: string | undefined, id: string | undefined) => {
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
