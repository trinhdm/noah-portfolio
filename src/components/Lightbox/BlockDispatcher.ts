import { getBlockType, findChildBy, isHeaderTag } from '../../utils'
import { LightboxArias, LightboxClass } from './constants'
import type { BlockTypes } from '../../types'


type BlockHandler = (block: HTMLElement) => HTMLElement | null


export class BlockDispatcher {
	private static handlers: Record<BlockTypes, BlockHandler> = {
		html: BlockDispatcher.handleHtmlBlock,
		image: BlockDispatcher.handleImageBlock,
		video: BlockDispatcher.handleVideoBlock,
	}

	static register(type: BlockTypes, handler: BlockHandler) {
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
			attributes = Array.from(cloned.attributes),
			children = Array.from(cloned.children)

		attributes.forEach(({ name, value }) => {
			if (name === 'class') {
				const classes = value.split(' ')
					.filter((cl, i) => (i === 0 || cl.includes(LightboxClass.Root)))
					.join(' ')
				cloned.setAttribute(name, classes)
			} else {
				cloned.removeAttribute(name)
			}
		})

		if (children.length > 1) {
			children.forEach(child => {
				if (child.className.includes('sqs-block')) return
				child.remove()
			})
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
				const children = Array.from(container.children)
				if (children.length === 1 && isHeaderTag(children[0].tagName)) return null

				const title = container.querySelector('[data-title]')
				if (title) title.id = LightboxArias.labelledby

				return outputBlock
			}
		)
	}

	private static handleImageBlock(block: HTMLElement): HTMLElement | null {
		return BlockDispatcher.handleBlock(block, '[data-animation-role]',
			(outputBlock, container) => {
				const img = container ? findChildBy(container, { tagName: 'img' }) : null
				if (!img) return null

				const link = container.querySelector('a')
				if (link) link.setAttribute('disabled', '')

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
				Object.assign(video, {
					controls: true,
					crossOrigin: true,
					muted: true,
					playsInline: true,
					poster: config.poster,
					src: config.source,
				})

				return video
			},
		}

		return BlockDispatcher.handleBlock(block, '.embed-block-wrapper',
			(outputBlock, container) => {
				let element: HTMLIFrameElement | HTMLVideoElement | null = null
				const nativeVideo = block.querySelector('[data-config-video]'),
					iframeVideo = block.querySelector('[data-html]')

				if (nativeVideo) {
					const json = (nativeVideo as HTMLElement).dataset?.configVideo
					element = Video.create(json)
				} else if (iframeVideo) {
					const json = (iframeVideo as HTMLElement).dataset?.html
					element = IFrame.create(json)
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
