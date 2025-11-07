import { SelectorManager } from './SelectorManager.ts'
import type { ICache } from '../types/interfaces.d.ts'
import type { LightboxElement, LightboxElements } from '../../../types'


export class LightboxCache implements ICache {
	private cache = new Map<keyof LightboxElements, LightboxElement>()
	private map: Partial<LightboxElements> = {}
	private selector: SelectorManager

	constructor(private root: LightboxElements['root']) {
		this.selector = new SelectorManager(root)

		const core = this.selector.collectDom(this.root)
		this.build([...core, 'arrows'])
	}

	private build<K extends keyof LightboxElements>(targets?: K[]): void {
		const map = {} as LightboxElements
		let selectors = Object.keys(this.selector.domSelectors) as K[]

		if (targets?.length) {
			selectors = selectors.reduce<K[]>((acc, selector) => {
				if (targets.includes(selector)) acc.push(selector)
				return acc
			}, [])
		}

		for (const key of selectors)
			map[key] = this.selector.query(key as typeof key)

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

		const value = (this.selector.query(key) ?? null) as LightboxElements[K]
		this.cache.set(key, value)
	}

	clear(): void { this.cache.clear() }
}
