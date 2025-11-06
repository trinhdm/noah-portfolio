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
		console.log('is empty:', wrapper.childElementCount)

		wrapper.replaceChildren(...content.children)
		this.rebuildCache()
	}

	updateContent(content: HTMLElement | undefined): void {
		const wrapper = this.cache.get('content')
		if (!wrapper || !content) return

		const selectors = Object.values(LightboxSelector)

		for (const child of wrapper.children) {
			const target = selectors.find(cl => child.classList.contains(cl.slice(1)))
			if (!target) continue

			const element = target.substring(target.lastIndexOf('_') + 1),
				replacement = content.querySelector(target)

			if (replacement) {
				child.replaceWith(replacement)
				this.reset(element as keyof LightboxElements)
			}
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
}
