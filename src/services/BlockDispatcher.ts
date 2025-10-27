import { findChildBy } from "../utils/dom"

const BLOCK_TYPES = ['html', 'image', 'video'] as const
type BlockTypes = typeof BLOCK_TYPES[number]
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
		const type = BlockDispatcher.getType(block)
		if (!type) return null

		const handler = BlockDispatcher.handlers[type]
		if (!handler) return null

		return handler(block)
	}

	static getType(block: HTMLElement): BlockTypes | null {
		const className = block.firstElementChild?.classList[1],
			matchClass = className?.match(/([a-z0-9-]+)-block/i)
		return (matchClass?.[1] ?? null) as BlockTypes | null
	}

	private static cloneBlock(block: HTMLElement): HTMLElement {
		const cloned = block.cloneNode(true) as HTMLElement,
			type = BlockDispatcher.getType(block)

		cloned.classList.add(`lightbox__${type}`)
		return cloned
	}

	private static processBlock(
		block: HTMLElement,
		callback: (clonedBlock: HTMLElement, original: HTMLElement) => HTMLElement | null
	) {
		const cloned = BlockDispatcher.cloneBlock(block)
		return callback(cloned, block)
	}

	private static handleHtmlBlock(block: HTMLElement): HTMLElement | null {
		const isHeaderTag = (tag: string) => /^H[1-4]$/.test(tag)

		return BlockDispatcher.processBlock(block, clonedBlock => {
			const container = block.querySelector('.sqs-html-content') as HTMLElement | null
			if (!container) return null

			const children = Array.from(container.children)
			if (children.length === 1 && isHeaderTag(children[0].tagName)) return null

			return clonedBlock
		})
	}

	private static handleImageBlock(block: HTMLElement): HTMLElement | null {
		return BlockDispatcher.processBlock(block, clonedBlock => {
			const container = block.querySelector('[data-animation-role]') as HTMLElement | null

			const img = container ? findChildBy(container, { tagName: 'img' }) : null
			if (!img) return null

			return clonedBlock
		})
	}

	private static handleVideoBlock(block: HTMLElement): HTMLElement | null {
		const IFrame = {
			create(json?: string): HTMLIFrameElement | null {
				if (!json?.length) return null

				try {
					const { html } = JSON.parse(json)
					if (typeof html !== 'string') return null

					const fragment = document.createDocumentFragment(),
						parsed = new DOMParser().parseFromString(html, 'text/html')

					Array.from(parsed.body.childNodes).forEach(node => fragment.appendChild(node.cloneNode(true)))

					const iframe = parsed.body.childNodes[0] as HTMLIFrameElement

					return iframe
				} catch { return null }
			}
		}

		const Video = {
			parseConfig(json: string | undefined) {
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
				const config = Video.parseConfig(json)
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
			}
		}

		return BlockDispatcher.processBlock(block, clonedBlock => {
			const nativeVideo = block.querySelector('[data-config-video]'),
				youtubeVideo = block.querySelector('[data-html]')

			let container: Element | null = null,
				element: HTMLIFrameElement | HTMLVideoElement | null = null

			if (nativeVideo) {
				const json = (nativeVideo as HTMLElement).dataset?.configVideo

				element = Video.create(json)
				container = clonedBlock.querySelector('.native-video-player')
				container?.classList.add('lightbox__video-player')
			} else if (youtubeVideo) {
				const jsonEl = youtubeVideo.closest('[data-block-json]') as HTMLElement | null,
					json = jsonEl?.dataset?.blockJson

				element = IFrame.create(json)
				container = clonedBlock.querySelector('.embed-block-wrapper')
			}

			if (!container || !element) return null

			const wrapper = document.createElement('div')
			wrapper.classList.add('lightbox__video-wrapper')
			wrapper.appendChild(element)
			container.replaceChildren(wrapper)

			return clonedBlock
		})
	}
}
