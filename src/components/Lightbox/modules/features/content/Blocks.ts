import { getBlockType, findChildBy, isHeaderTag } from '../../../../../utils'
import { LightboxArias, LightboxClass } from '../../../utils'
import type { BlockHandler } from '../types/features.types.d.ts'
import type { BlockTypes } from '../../../../../types'
import type { IBlocks } from '../types/interfaces.d.ts'


class BlockDispatcher {
	private static handlers: Record<BlockTypes, BlockHandler> = {
		html: BlockDispatcher.handleHtmlBlock,
		image: BlockDispatcher.handleImageBlock,
		video: BlockDispatcher.handleVideoBlock,
	}

	static register(type: BlockTypes, handler: BlockHandler): void {
		if (Object.hasOwn(BlockDispatcher.handlers, type))
			console.warn(`[BlockDispatcher] overwriting handler for ${type}`)

		BlockDispatcher.handlers[type] = handler
	}

	static format(block: HTMLElement): HTMLElement | null {
		const type = getBlockType(block)
		if (!type) return null

		const handler = BlockDispatcher.handlers[type]
		if (!handler) return null

		return handler(block)
	}

	private static sanitizeBlock(block: HTMLElement): HTMLElement {
		const cloned = block.cloneNode(true) as HTMLElement,
			attributes = Array.from(cloned.attributes)

		for (const { name, value } of attributes) {
			if (name === 'class') {
				const classes = value.split(' ')
					.filter((cl, i) => (i === 0 || cl.includes(LightboxClass.Root)))
					.join(' ')
				cloned.setAttribute(name, classes)
			} else {
				cloned.removeAttribute(name)
			}
		}

		if (cloned.childElementCount > 1) {
			const children = Array.from(cloned.children)
			for (const child of children)
				if (!child.className.includes('sqs-block')) child.remove()
		}

		const type = getBlockType(block)
		cloned.classList.add('lightbox-block', `lightbox__${type}`)

		return cloned
	}

	private static handleBlock(
		block: HTMLElement,
		selector: string,
		handler: (outputBlock: HTMLElement, container: HTMLElement) => HTMLElement | null
	): HTMLElement | null {
		const outputBlock = BlockDispatcher.sanitizeBlock(block),
			container = outputBlock.querySelector(selector) as HTMLElement | null

		if (!container) return null
		return handler(outputBlock, container)
	}

	private static handleHtmlBlock(block: HTMLElement): HTMLElement | null {
		return BlockDispatcher.handleBlock(block, '[data-sqsp-text-block-content]',
			(outputBlock, container) => {
				const children = Array.from(container.children),
					title = container.querySelector('[data-title]')

				if (children.length === 1 && isHeaderTag(children[0].tagName))
					return null

				if (title) {
					title.id = LightboxArias.labelledby

					if (title.nextSibling?.nodeType === Node.TEXT_NODE) {
						const titleEl = document.createElement('p')

						titleEl.appendChild(title.cloneNode(true))
						title.remove()
						container.prepend(titleEl)
					}
				}

				return outputBlock
			}
		)
	}

	private static handleImageBlock(block: HTMLElement): HTMLElement | null {
		return BlockDispatcher.handleBlock(block, '[data-animation-role]',
			(outputBlock, container) => {
				const img = findChildBy(container, { tagName: 'img' }),
					link = container.querySelector('a')

				if (!img) return null

				if (link) {
					link.removeAttribute('href')
					link.setAttribute('disabled', '')
				}

				return outputBlock
			}
		)
	}

	private static handleVideoBlock(block: HTMLElement): HTMLElement | null {
		const IFrame = {
			parse(config?: string) {
				if (!config?.length) return null

				try {
					const html = config.startsWith('{') ? JSON.parse(config) : config
					if (typeof html !== 'string') return null

					const parsed = new DOMParser().parseFromString(html, 'text/html')
					return parsed
				} catch { return null }
			},

			create(json?: string): HTMLIFrameElement | null {
				const parsed = IFrame.parse(json)
				if (!parsed) return null

				const html = parsed.body,
					nodes = Array.from(html.childNodes ?? [])
				let iframe = html as HTMLIFrameElement

				if (!!nodes.length) {
					const fragment = document.createDocumentFragment()
					nodes.forEach(node => fragment.appendChild(node.cloneNode(true)))
					iframe = nodes[0] as HTMLIFrameElement
				}

				return iframe
			}
		}

		const Video = {
			parse(json?: string) {
				if (!json?.length) return null

				try {
					const { alexandriaLibraryId, systemDataId } = JSON.parse(json)
					if (!alexandriaLibraryId || !systemDataId) return null

					const url = `https://video.squarespace-cdn.com/content/v1/${alexandriaLibraryId}/${systemDataId}`

					return {
						poster: `${url}/thumbnail`,
						source: `${url}/playlist.m3u8`,
					}
				} catch { return null }
			},

			create(json?: string): HTMLVideoElement | null {
				const config = Video.parse(json)
				if (!config) return null

				const video: HTMLVideoElement = document.createElement('video')
				const attributes = {
					controls: true,
					crossOrigin: true,
					muted: true,
					playsInline: true,
					poster: config.poster,
					src: config.source,
				}

				Object.assign(video, attributes)

				return video
			},
		}

		return BlockDispatcher.handleBlock(block, '.embed-block-wrapper',
			(outputBlock, container) => {
				let element: HTMLIFrameElement | HTMLVideoElement | null = null
				const nativeData = block.querySelector('[data-config-video]'),
					iframeData = block.querySelector('[data-html]')

				if (nativeData) {
					const data = (nativeData as HTMLElement).dataset?.configVideo
					element = Video.create(data)
				} else if (iframeData) {
					const data = (iframeData as HTMLElement).dataset?.html
					element = IFrame.create(data)
				}

				if (!element) return null

				const wrapper = document.createElement('div')
				wrapper.classList.add(`${LightboxClass.Video}-wrapper`)

				wrapper.appendChild(element)
				container.replaceChildren(wrapper)

				return outputBlock
			}
		)
	}
}


export const LightboxBlocks: IBlocks = BlockDispatcher
