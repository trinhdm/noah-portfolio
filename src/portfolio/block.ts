import { fetchContent, getPage } from '../global/fetch.ts'
import { findChildBy, getDeepestChild, tidyContent, wrapTrimEl } from '../global/utils.ts'
import { configureTemp } from './onLoad.ts'


type BlockGroup = {
	blocks: NodeListOf<Element>
	index: number
	isWrapped?: boolean
	target: HTMLElement
}

type ConfigureGroup = Pick<BlockGroup, 'index' | 'target'>
type TitleGroup = Pick<BlockGroup, 'blocks' | 'index' | 'isWrapped'>

type BlockConfig = {
	block: Element
	cloneBlock: Element
	details: HTMLDivElement
}


const configureBlock = ({ index, target }: ConfigureGroup) => {
	const block = target.closest('.fe-block')!,
		cloneBlock = block.cloneNode(true)
		// gridBlock = new Grid(i)

	const blockStyles = {
		animationDelay: `${(.075 * index) + .75}s`,
		// gridArea: gridBlock.Area.size,
		order: index + 1,
	}

	block.classList.add('portfolio')
	block.setAttribute('data-index', `${index}`)
	Object.assign((block as HTMLElement).style, blockStyles)

	const details = document.createElement('div'),
		imageEl = findChildBy(target, { tagName: 'img' })

	details.classList.add('portfolio__details')
	imageEl?.classList.add('portfolio__image')

	return { block, cloneBlock, details } as BlockConfig
}


const formatBlock = (block: Element, id: string = '') => {
	const getChildBlocks = (selector: string) => (
		(block.querySelector(selector) as HTMLElement | undefined)?.children
	)

	const type = block.querySelector('.sqs-block')?.classList[1]?.split('-block')[0]
	let condition: boolean | undefined,
		els = undefined,
		html: HTMLElement | string | undefined = ''

	switch (type) {
		case 'code':
			els = !!id ? getChildBlocks(`#${id}`) : undefined
			break
		case 'html':
			els = getChildBlocks('.sqs-html-content')
			condition = !!els
				? !(els.length === 1 && ['H1', 'H2', 'H3', 'H4'].includes(els[0].tagName))
				: undefined
			break
		case 'image':
			[els] = getChildBlocks('[data-animation-role]')
			html = !!els ? findChildBy(els as HTMLElement, { tagName: 'img' }) : ''
			break
		case 'video':
			const nativeVideo = block.querySelector('[data-config-video]'),
				ytVideo = block.querySelector('[data-html]')

			if (!!ytVideo) {
				els = ytVideo as HTMLElement
				html = els?.dataset?.html?.trim()
			}

			// else if (!!nativeVideo) {
			// 	els = nativeVideo as HTMLElement
			// 	html = els?.dataset?.configVideo?.trim()
			// }
			break
	}

	if (!els) return

	if (typeof condition !== 'boolean')
		condition = els instanceof HTMLCollection
			? !!els?.length
			: !!els

	if (!!condition) {
		block.classList.add(`lightbox__${type}`)

		if (!html) return

		els = els as HTMLElement
		els.innerHTML = ''

		switch (typeof html) {
			case 'object':
				return els.appendChild(html)
			case 'string':
				return (els.innerHTML = html)
		}
	}

	block.remove()
}

const styleBlock = () => {
	const items = document.querySelectorAll('.fe-block:not(.portfolio)')

	items.forEach(item => {
		const [deepest] = getDeepestChild(item)

		if (!!deepest.textContent) {
			const { textContent: text } = deepest

			if (!text.includes(' ')) return

			deepest.classList.add('block__typography')
			deepest.innerHTML = ''

			const elements = text.split(' ')
				.map(str => tidyContent(str, 'span'))

			elements.forEach(el => {
				if (!el) return
				deepest.appendChild(el)
			})
		}
	})
}


const getBlockTitle = async ({
	blocks,
	index: i,
	isWrapped = true
}: TitleGroup) => {
	if (!blocks[i]) return

	const args = { index: i, target: blocks[i] as HTMLElement }
	const { id, url } = getPage(args)

	return await fetchContent(url, id)?.then(content => {
		if (typeof content !== 'string') return

		const temp = configureTemp({ content }),
			wrapper = temp.querySelector('[data-sqsp-text-block-content]') as HTMLElement | undefined,
			title = findChildBy(wrapper, { tagName: 'strong' })

		if (!title) return

		return isWrapped
			? wrapTrimEl(title, 'span')
			: title
	})
}


export const blockActions = {
	configure: (args: ConfigureGroup) => configureBlock(args),
	format: (block: Element, id?: string) => formatBlock(block, id),
	getTitle: (args: TitleGroup) => getBlockTitle(args),
	style: () => styleBlock(),
}
