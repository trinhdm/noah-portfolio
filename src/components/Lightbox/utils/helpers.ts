import { LightboxSelector } from './constants'
import type { LightboxElements } from '@lightbox/types'


export const extractCacheKey = (element: Element | null): keyof LightboxElements | undefined => {
	if (!element) return

	let key = ''
	const selectors = Object.values(LightboxSelector),
		target = selectors.find(str => element.classList.contains(str.slice(1)))

	if (!target) return
	else if (target === LightboxSelector.Root) key = 'root'
	else key = target.substring(target.lastIndexOf('_') + 1)

	return key as keyof LightboxElements
}
