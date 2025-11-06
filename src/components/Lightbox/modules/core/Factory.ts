import template from '../../utils/template.ts'
import { LightboxClass } from '../../utils'
import type { LightboxOptions } from '../../types'


export class LightboxFactory {
	private readonly ignored: string[] = ['innerHTML', 'innerText', 'outerHTML', 'textContent']

	constructor() {}

	createRoot({ properties }: LightboxOptions): HTMLDialogElement {
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
