import { fetchContent } from "../global/fetch"
import { formatBlock } from "../portfolio/block/formatBlock"
import type { PageGroup } from "../global/utils.types"


const findElement = (
	target:  HTMLElement | null,
	selector = '.fe-block'
): HTMLElement | null => {
	if (!target)
		return null

	else if (target.classList.contains(selector))
		return target

	return target.closest(selector)
}


const setContent = async (
	instance: {
		block: HTMLElement | null
		page: PageGroup
	},
	selector = '.fe-block'
): Promise<HTMLDivElement | undefined> => {
	const { block, page } = instance

	const content = await fetchContent(page) ?? ''

	if (typeof content !== 'string') return

	const imageWrapper: HTMLElement | null = (block
		?.querySelector('[data-sqsp-image-block-image-container]')
		?.closest(selector)) ?? null
	const temp: HTMLDivElement | undefined = document.createElement('div')

	if (imageWrapper && !temp.contains(imageWrapper)) {
		const imageCopy = imageWrapper?.cloneNode(true) as HTMLElement ?? null
		temp.prepend(imageCopy!)
	}

	temp.innerHTML += content
	temp.querySelectorAll(selector).forEach(block => formatBlock(block as HTMLElement, page.id))

	return temp
}


export { findElement, setContent }
