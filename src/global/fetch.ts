import { findChildBy } from './utils.ts'
import type { PageGroup } from './utils.types'


export const getPage = (element: HTMLElement | null): PageGroup | null => {
	const anchor = element
		? findChildBy(element, { tagName: 'a' })
		: null
	if (!anchor) return null

	const { hash, href } = anchor as HTMLAnchorElement
	const id = hash?.slice(1),
		[url] = href?.split('#')

	if (!id || !url) return null
	return { id, url }
}
