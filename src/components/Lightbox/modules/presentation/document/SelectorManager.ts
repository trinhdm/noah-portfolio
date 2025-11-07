import {
	extractCacheKey,
	LightboxBlockSelector,
	LightboxSelector ,
} from '../../../utils'

import type { ISelector } from '../types/interfaces.d.ts'
import type { LightboxElements } from '../../../types'


export class SelectorManager implements ISelector {
	domSelectors = {
		root: '',
		arrows: '',
		blocks: LightboxBlockSelector.Root,
		body: LightboxSelector.Body,
		container: LightboxSelector.Container,
		content: LightboxSelector.Content,
		exit: '',
		footer: LightboxSelector.Footer,
		html: LightboxSelector.Html,
		icons: LightboxSelector.Icon,
		image: LightboxSelector.Image,
		navigation: LightboxSelector.Navigation,
		player: '',
		video: LightboxSelector.Video,
	} as const satisfies Record<
		keyof LightboxElements,
		string
	>

	constructor(private root: LightboxElements['root']) {}

	private getSelectors(): typeof this.domSelectors { return this.domSelectors }

	query<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		let result
		const root = this.root,
			target = this.domSelectors[key]

		if (!target) {
			switch (key) {
				case 'root':
					result = root
					break
				case 'arrows':
					const navigation = this.query('navigation')
					result = Array.from(navigation?.querySelectorAll('[data-direction]') ?? [])
					break
				case 'exit':
					const icons = this.query('icons')
					result = icons?.find(ic => ic.dataset.icon === 'close')
					break
				case 'player':
					const video = this.query('video')
					result = video?.querySelector('video') || video?.querySelector('iframe')
					break
				default: console.warn(`unknown selector for '${key}'`)
					break
			}
		} else {
			const isQueryAll = key.endsWith('s') || key === 'html'

			result = isQueryAll
				? Array.from(root.querySelectorAll(target) ?? [])
				: root.querySelector(target)
		}

		return result as LightboxElements[K]
	}

	collectDom(parent: Element | null): (keyof LightboxElements)[] {
		const traverse = (element: Element | null): (keyof LightboxElements)[] => {
			if (!element || !element.children) return []

			const key = extractCacheKey(element),
				query = (key ? [key] : []) as (keyof LightboxElements)[]

			return query.concat(Array.from(element.children)
				.reduce<(keyof LightboxElements)[]>((acc, child) => {
					if (child.className) return acc.concat(traverse(child))
					return acc
				}, []))
		}

		const queries = traverse(parent)
		return Array.from(new Set<keyof LightboxElements>(queries))
	}
}
