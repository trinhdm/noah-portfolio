import { findChildBy } from '../../../global/utils.ts'


type SourceResult = {
	poster: string
	source: string
}

const isHeaderTag = (tag: string) => /^H[1-4]$/.test(tag)

const clone = <T extends Node>(node: T | null): T | null =>
	(node ? (node.cloneNode(true) as T) : null)

const getSource = (json: string | undefined): SourceResult => {
	let poster = '',
		source = ''

	if (json?.length) {
		const {
			alexandriaLibraryId,
			systemDataId,
		} = JSON.parse(json)

		if (alexandriaLibraryId.length && systemDataId.length) {
			const slug = `${alexandriaLibraryId}/${systemDataId}`,
				url = `https://video.squarespace-cdn.com/content/v1/${slug}`
			poster = `${url}/thumbnail`
			source = `${url}/playlist.m3u8`
		}
	}

	return { poster, source }
}

const createVideo = (json: string): HTMLVideoElement => {
	const { poster, source } = getSource(json)
	const video: HTMLVideoElement = document.createElement('video')

	Object.assign(video, {
		controls: true,
		crossOrigin: true,
		id: 'lightbox-player',
		muted: 'muted',
		playsInline: true,
		poster,
		src: source,
	})

	return video
}

const createIFrame = (json: string): HTMLIFrameElement | null => {
	const { html } = JSON.parse(json)
	let iframe: HTMLIFrameElement | null = null

	if (typeof html === 'string') {
		const parsed = new DOMParser().parseFromString(html, 'text/html')
		const fragment = document.createDocumentFragment()

		Array.from(parsed.body.childNodes).forEach(node => fragment.appendChild(node.cloneNode(true)))

		iframe = parsed.body.childNodes[0] as HTMLIFrameElement
	}

	return iframe
}

export const formatBlock = (block: HTMLElement) => {
	const clonedBlock = clone(block)!,
		type = block.firstElementChild?.classList[1]?.match(/([a-z0-9-]+)-block/i)?.[1]

	let container: HTMLElement | null = null,
		formatted: HTMLElement | null = null

	switch (type) {
		case 'html':
			container = block.querySelector('.sqs-html-content') as HTMLElement | null
			if (!container) return null

			const children = Array.from(container.children)
			if (children.length === 1 && isHeaderTag(children[0].tagName)) return null

			formatted = clonedBlock
			break

		case 'image':
			container = block.querySelector('[data-animation-role]') as HTMLElement | null
			const img = container ? findChildBy(container, { tagName: 'img' }) : null
			if (!img) return null

			formatted = clonedBlock
			break

		case 'video': {
			const nativeVideo = block.querySelector('[data-config-video]'),
				ytVideo = block.querySelector('[data-html]')

			let container: Element | null = null,
				json: string | undefined = undefined,
				videoChild: HTMLIFrameElement | HTMLVideoElement | null = null

			if (ytVideo) {
				const jsonEl = ytVideo.closest('[data-block-json]') as HTMLElement | null
				json = jsonEl?.dataset?.blockJson

				if (json) {
					try {
						videoChild = createIFrame(json)
						container = clonedBlock.querySelector('.embed-block-wrapper')
					} catch {}
				}
			} else if (nativeVideo) {
				json = (nativeVideo as HTMLElement).dataset?.configVideo

				if (json) {
					try {
						videoChild = createVideo(json)
						container = clonedBlock.querySelector('.native-video-player')
						container?.classList.add('lightbox__video-player')
					} catch {}
				}
			}

			if (!container || !videoChild) return null

			const wrapper = document.createElement('div')
			wrapper.classList.add('lightbox__video-wrapper')
			wrapper.appendChild(videoChild)

			container.replaceChildren(wrapper)
			formatted = clonedBlock

			break
		}
	}

	if (!!formatted)
		formatted.classList.add(`lightbox__${type}`)

	return formatted ?? null
}
