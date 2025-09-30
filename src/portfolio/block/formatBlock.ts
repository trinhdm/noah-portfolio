import { findChildBy, wrapTrimEl } from '../../global/utils.ts'


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


export const formatBlock = (
	block: Element,
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
			// formatTitle(block)
			els = getChildBlocks('.sqs-html-content')
			// const test = formatTitle(block)
			// html = formatTitle(block)
			// console.log({ test, type: typeof test })

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

			let wrapper = document.createElement('div')
			wrapper.classList.add('lightbox__video-wrapper')

			if (!!ytVideo) {
				els = ytVideo as HTMLElement
				wrapper.innerHTML = (els?.dataset?.html) ?? ''
			}

			else if (!!nativeVideo) {
				const json = (nativeVideo as HTMLElement)?.dataset?.configVideo,
					{ poster, source } = getSource(json)

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
