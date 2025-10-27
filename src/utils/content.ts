import { fetchContent } from "../global/fetch"
import { formatBlock } from "../pages/Portfolio/block/formatBlock"
import type { PageGroup } from "../global/utils.types"


const findElement = (
	target:  HTMLElement | null,
	selector = '.fe-block'
): HTMLElement | null => {
	if (!target) return null
	else if (target.matches(selector)) return target

	return target.closest(selector) as HTMLElement | null
}


const setContent = async (
	instance: {
		block: HTMLElement | null
		page: PageGroup
	},
	selector = '.fe-block'
): Promise<HTMLDivElement | undefined> => {
	const { block, page } = instance

	try {
		const content = await fetchContent(page)

		if (typeof content !== 'string') return

		const container = document.createElement('div')
		const imageWrapper = block
			?.querySelector('[data-sqsp-image-block-image-container]')
			?.closest(selector)

		if (imageWrapper)
			container.prepend(imageWrapper.cloneNode(true) as HTMLElement)

		container.innerHTML += content
		container.querySelectorAll(selector).forEach(block => formatBlock(block as HTMLElement, page.id))

		return container
	} catch(err) { console.error(err) }
}


export { findElement, setContent }
