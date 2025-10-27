import { findChildBy } from './utils.ts'
import type { PageGroup } from './utils.types'


export const getPage = (element: HTMLElement | null): PageGroup => {
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


export const fetchContent = ({ id, url }: PageGroup): Promise<string | undefined> => {
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
