import { findChildBy, wrapTrimEl } from '../../../global/utils.ts'


const getSource = (json: string | undefined) => {
	let url = '',
		poster = '',
		source = ''

	if (json?.length) {
		const {
			alexandriaLibraryId,
			systemDataId,
		} = JSON.parse(json)

		if (alexandriaLibraryId.length && systemDataId.length) {
			const slug = `${alexandriaLibraryId}/${systemDataId}`

			url = `https://video.squarespace-cdn.com/content/v1/${slug}`
			source = `${url}/playlist.m3u8`
			poster = `${url}/thumbnail`
		}
	}

	const config = {
		poster,
		source,
	}

	return config
}

const getChildBlocks = (selector: string, element: HTMLElement) => (
	(element.querySelector(selector) as HTMLElement | undefined)?.children
)

const formatTitle = (block: Element) => {
	const titleWrapper = block.querySelector('[data-sqsp-text-block-content]') as HTMLElement | undefined

	if (titleWrapper) {
		const title = findChildBy(titleWrapper, { tagName: 'strong' }),
			newTitle = wrapTrimEl(title, 'strong')

		if (!!title && !!newTitle)
			titleWrapper.replaceWith(newTitle, title)
		// 	titleWrapper.replaceChild(newTitle, title)
		// console.log({ titleWrapper, newTitle, title })
	}

	return titleWrapper
}

const formatHTML = (block: HTMLElement) => {
	let condition,
		els,
		html

	els = getChildBlocks('.sqs-html-content', block)
	condition = [...els!].length === 1
		&& [...els!].every(({ tagName }) => ['H1', 'H2', 'H3', 'H4'].includes(tagName))

	return { condition, els, html }
}

const formatImage = (block: HTMLElement) => {
	let condition,
		els,
		html

	els = getChildBlocks('[data-animation-role]', block)
	condition = !!els
	html = findChildBy(els?.item(0) as HTMLElement, { tagName: 'img' })

	return { condition, els, html }
}

const formatVideo = (block: HTMLElement) => {
	let condition,
		els,
		html

	const nativeVideo = block.querySelector('[data-config-video]'),
		ytVideo = block.querySelector('[data-html]')

	condition = nativeVideo || ytVideo

	let json,
		wrapper = document.createElement('div')
	wrapper.classList.add('lightbox__video-wrapper')

	if (!!ytVideo) {
		json = (ytVideo?.closest('[data-block-json]')as HTMLElement)?.dataset?.blockJson

		const { html, url } = JSON.parse(json!)
		// 	id = url.split('=').at(-1),
		// 	source = `https://www.youtube.com/embed/${id}?feature=oembed`

		// const template = `
		// 	<iframe
		// 		allowfullscreen
		// 		allow="autoplay; encrypted-media"
		// 		frameborder="0"
		// 		id="lightbox-player"
		// 		modestbranding=1
		// 		src="${source}"
		// 	></iframe>
		// `.trim()

		els = (ytVideo as HTMLElement)?.closest('.embed-block-wrapper')
		wrapper.innerHTML = html
	}

	else if (!!nativeVideo) {
		json = (nativeVideo as HTMLElement)?.dataset?.configVideo
		const { poster, source } = getSource(json)

		const template = `
			<video
				autoplay
				controls
				crossorigin
				playsinline
				id="lightbox-player"
				muted="muted"
				poster="${poster}"
				src="${source}"
			></video>
		`.trim()

		els = (nativeVideo as HTMLElement)?.querySelector('.native-video-player')
		els?.classList.add('lightbox__video-player')

		wrapper.innerHTML = template
	}

	html = wrapper

	return { condition, els, html }
}


export const formatBlock = (
	block: HTMLElement,
	id: string = ''
) => {
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
			// condition = [...els!].filter(el => (['H1', 'H2', 'H3', 'H4'].includes(el.tagName)))

			condition = !!els
				? !(els.length === 1 && ['H1', 'H2', 'H3', 'H4'].includes(els[0].tagName))
				: undefined
			break
		case 'image':
			[els] = getChildBlocks('[data-animation-role]')
			html = !!els ? findChildBy(els as HTMLElement, { tagName: 'img' }) : ''
			// console.log({ els, list: getChildBlocks('[data-animation-role]'), html })
			break
		case 'video':
			const nativeVideo = block.querySelector('[data-config-video]'),
				ytVideo = block.querySelector('[data-html]')

			let json,
				wrapper = document.createElement('div')
			wrapper.classList.add('lightbox__video-wrapper')

			if (!!ytVideo) {
				json = (ytVideo?.closest('[data-block-json]')as HTMLElement)?.dataset?.blockJson

				const { html, url } = JSON.parse(json!)
				// 	id = url.split('=').at(-1),
				// 	source = `https://www.youtube.com/embed/${id}?feature=oembed`

				// const template = `
				// 	<iframe
				// 		allowfullscreen
				// 		allow="autoplay; encrypted-media"
				// 		frameborder="0"
				// 		id="lightbox-player"
				// 		modestbranding=1
				// 		src="${source}"
				// 	></iframe>
				// `.trim()

				els = (ytVideo as HTMLElement)?.closest('.embed-block-wrapper')
				wrapper.innerHTML = html

				// els = ytVideo as HTMLElement
				// wrapper.innerHTML = (els?.dataset?.html) ?? ''
				// console.log('youtube', els?.dataset?.html)
			}

			else if (!!nativeVideo) {
				json = (nativeVideo as HTMLElement)?.dataset?.configVideo
				const { poster, source } = getSource(json)

				const template = `
					<video
						autoplay
						controls
						crossorigin
						playsinline
						id="lightbox-player"
						muted="muted"
						poster="${poster}"
						src="${source}"
					></video>
				`.trim()

				els = (nativeVideo as HTMLElement)?.querySelector('.native-video-player')
				els?.classList.add('lightbox__video-player')

				wrapper.innerHTML = template
			}

			html = wrapper
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
		// console.log(html, typeof html)

		switch (typeof html) {
			case 'object':
				return els.appendChild(html)
			case 'string':
				return els.append(html.trim())
				// return (els.innerHTML = html.trim())
		}
	} else {
		block.remove()
	}
}
