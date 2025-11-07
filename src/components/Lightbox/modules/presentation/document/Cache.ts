import { LightboxBlockSelector, LightboxSelector } from '../../../utils'
import type { LightboxElement, LightboxElements } from '../../../types'
import type { ICache } from '../types/interfaces.d.ts'


export class LightboxCache implements ICache {
	private cache = new Map<keyof LightboxElements, LightboxElement>()
	private map: Partial<LightboxElements> = {}

	private selectors = {
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

	constructor(private root: HTMLDialogElement) {
		const core = this.collectQueries(this.root)
		this.build([...core, 'arrows'])
	}

	private collectQueries(parent: Element | null): (keyof LightboxElements)[] {
		const selectors = Object.values(LightboxSelector)

		const traverse = (element: Element | null): (keyof LightboxElements)[] => {
			if (!element || !element.children) return []

			const target = selectors.find(str => element.classList.contains(str.slice(1)))
			if (!target) return []

			const lastIndex = target.lastIndexOf('_'),
				key = lastIndex > -1 ? target.substring(lastIndex + 1) : 'root',
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

	private query<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		let result
		const root = this.root,
			target = this.selectors[key]

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

	private build<K extends keyof LightboxElements>(targets?: K[]): void {
		const map = {} as LightboxElements
		let selectors = Object.keys(this.selectors) as K[]

		if (targets?.length) {
			selectors = selectors.reduce<K[]>((acc, selector) => {
				if (targets.includes(selector)) acc.push(selector)
				return acc
			}, [])
		}

		for (const key of selectors)
			map[key] = this.query(key as typeof key)

		this.map = map as LightboxElements
		this.clear()
	}

	private validate(value: LightboxElement): boolean {
		return !(value instanceof Node) || document.contains(value)
	}

	rebuild(): void {
		this.build()
		this.clear()
	}

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		if (this.cache.has(key)) {
			const cached = this.cache.get(key) as LightboxElements[K]
			const isValid = Array.isArray(cached)
				? cached.some(cv => this.validate(cv))
				: this.validate(cached)

			if (!isValid) this.reset(key)
			return this.cache.get(key) as LightboxElements[K]
		}

		const value = (this.map[key] ?? null) as LightboxElements[K]
		this.cache.set(key, value)

		return value
	}

	reset<K extends keyof LightboxElements>(key: K): void {
		if (this.cache.has(key)) this.cache.delete(key)

		const value = (this.query(key) ?? null) as LightboxElements[K]
		this.cache.set(key, value)
	}

	clear(): void { this.cache.clear() }
}
