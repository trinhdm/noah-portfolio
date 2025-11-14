import template from '@lightbox/utils/template.ts'
import { LightboxClass } from '@lightbox/utils'
import type { LightboxElements, LightboxOptions } from '@lightbox/types'
import type { IFactory } from '@core'


export class LightboxFactory implements IFactory {
	private readonly ignored: string[] = ['innerHTML', 'innerText', 'outerHTML', 'textContent']

	constructor() {}

	createRoot({ properties }: LightboxOptions): LightboxElements['root'] {
		const root = document.createElement('dialog')

		root.classList.add(LightboxClass.Root)
		root.innerHTML = template

		if (properties) {
			const props = Object.entries(properties)

			for (const [prop, val] of props)
				if (!this.ignored.includes(prop)) root.setAttribute(prop, String(val))
		}

		return root
	}
}
