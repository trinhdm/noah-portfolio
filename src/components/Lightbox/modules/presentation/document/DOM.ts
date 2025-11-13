import { extractCacheKey } from './../../../utils/helpers';
import { toggleDisableAttr } from '../../../../../utils'
import { LightboxCache } from './Cache.ts'
import { LightboxSelector } from '../../../utils'

import type {
	DataValues,
	LightboxAnimations,
	LightboxStates,
} from '../types/presentation.types.d.ts'

import type { ICache, IDOM } from '../types/interfaces.d.ts'
import type { LightboxElements } from '../../../types'


export class LightboxDOM implements IDOM {
	private readonly cache: ICache

	constructor(private root: LightboxElements['root']) {
		this.cache = new LightboxCache(this.root)
	}

	setContent(content: HTMLElement | undefined): void {
		const wrapper = this.cache.get('content')

		if (!content || !wrapper) return
		const { children } = wrapper

		if (children.length) {
			for (const child of children) {
				const ckey = extractCacheKey(child)
				if (!ckey) continue

				const key = ckey.charAt(0).toUpperCase() + ckey.slice(1),
					selector = LightboxSelector[key as keyof typeof LightboxSelector],
					replacement = content.querySelector(selector)

				if (replacement) {
					child.replaceWith(replacement)
					this.reset(ckey)
				}
			}
		} else {
			wrapper.replaceChildren(...content.children)
			this.cache.rebuild()
		}
	}

	onChange(
		attr: string,
		callback: (current: string | null, observer: MutationObserver) => void
	): MutationObserver {
		const observer = new MutationObserver(mutationList => {
			for (const mutate of mutationList) {
				if (mutate.attributeName !== attr) continue
				const newValue = (mutate.target as HTMLElement).getAttribute(attr)
				callback(newValue, observer)
				break
			}
		})

		observer.observe(this.root, { attributes: true, attributeOldValue: true })
		return observer
	}

	get<K extends keyof LightboxElements>(key: K): LightboxElements[K] {
		return this.cache.get(key)
	}

	reset<K extends keyof LightboxElements>(key: K): void { this.cache.reset(key) }

	clearCache(): void { this.cache.clear() }

	rebuildCache(): void { this.cache.rebuild() }

	append(): void { document.body.appendChild(this.root) }

	remove(): void { this.root.remove() }

	toggleDisable(): void { toggleDisableAttr(this.root) }

	toggleIcons(): void { this.cache.get('icons').forEach(c => c.disabled = !c.disabled) }

	setAnimate(value: LightboxAnimations = ''): void { this.root.dataset.animate = value }

	setState(state: LightboxStates): void { this.root.dataset.state = state }

	getData<K extends keyof DataValues>(key: K): DataValues[K] {
		const value = this.root.dataset[key]
		return {
			animate: value as LightboxAnimations,
			disabled: value as `${boolean}`,
			state: value as LightboxStates,
		}[key]
	}

	setData<K extends keyof DataValues>(key: K, value: DataValues[K]): void {
		this.root.dataset[key] = value
	}
}
