// import { findChildBy } from '../../global/utils.ts'


// type FormatOptions {
// 	block: HTMLElement | null
// }

// export class Format {

// 	// type =

// 	block: HTMLElement | undefined
// 	methods: Record<string, () => {}> = {}
// 	type: string | undefined = ''

// 	constructor({
// 		block,
// 	}: FormatOptions) {
// 		if (!block) return

// 		this.block = block
// 		this.type = ''
// 		// block.querySelector('.sqs-block')?.classList[1]?.split('-block')[0]

// 		this.methods = {
// 			html: this.html(),
// 			image: this.image(),
// 			video: this.video()
// 		}
// 	}

// 	public static async init(options: BlockOptions) {
// 		const instance = new Format(options)

// 		instance.type = instance.block?.querySelector('.sqs-block')?.classList[1]?.split('-block')[0]

// 		if (instance.type && Object.hasOwn(instance.methods, instance.type))
// 			instance.methods[instance.type]()

// 		return instance
// 	}

// 	private getSource(json: string | undefined) {
// 		let url = '',
// 			poster = '',
// 			source = ''

// 		if (json?.length) {
// 			const {
// 				alexandriaLibraryId,
// 				systemDataId,
// 			} = JSON.parse(json)

// 			if (alexandriaLibraryId.length && systemDataId.length) {
// 				const slug = `${alexandriaLibraryId}/${systemDataId}`

// 				url = `https://video.squarespace-cdn.com/content/v1/${slug}`
// 				source = `${url}/playlist.m3u8`
// 				poster = `${url}/thumbnail`
// 			}
// 		}

// 		const config = {
// 			poster,
// 			source,
// 		}

// 		return config
// 	}


// 	private getChildBlocks(selector: string){
// 		return (this.block?.querySelector(selector) as HTMLElement | undefined)?.children
// 	}

// 	private html() {
// 		const els = this.getChildBlocks('.sqs-html-content')
// 		const condition = [...els!].length === 1
// 			&& [...els!].every(({ tagName }) => ['H1', 'H2', 'H3', 'H4'].includes(tagName))

// 		return { els, condition }
// 	}

// 	private image() {
// 		const els = this.getChildBlocks('[data-animation-role]')
// 		const condition = !!els
// 		const html = findChildBy(els?.item(0) as HTMLElement, { tagName: 'img' })

// 		return { condition, els, html }
// 	}

// 	private video() {
// 		let condition, els, html

// 		const nativeVideo = this.block?.querySelector('[data-config-video]'),
// 			ytVideo = this.block?.querySelector('[data-html]')

// 		condition = nativeVideo || ytVideo

// 		let json,
// 			wrapper = document.createElement('div')
// 		wrapper.classList.add('lightbox__video-wrapper')

// 		if (!!ytVideo) {
// 			json = (ytVideo?.closest('[data-block-json]')as HTMLElement)?.dataset?.blockJson

// 			const { html, url } = JSON.parse(json!)
// 			// 	id = url.split('=').at(-1),
// 			// 	source = `https://www.youtube.com/embed/${id}?feature=oembed`

// 			// const template = `
// 			// 	<iframe
// 			// 		allowfullscreen
// 			// 		allow="autoplay; encrypted-media"
// 			// 		frameborder="0"
// 			// 		id="lightbox-player"
// 			// 		modestbranding=1
// 			// 		src="${source}"
// 			// 	></iframe>
// 			// `.trim()

// 			els = (ytVideo as HTMLElement)?.closest('.embed-block-wrapper')
// 			wrapper.innerHTML = html
// 		}

// 		else if (!!nativeVideo) {
// 			json = (nativeVideo as HTMLElement)?.dataset?.configVideo
// 			const { poster, source } = this.getSource(json)

// 			const template = `
// 				<video
// 					autoplay
// 					controls
// 					crossorigin
// 					playsinline
// 					id="lightbox-player"
// 					muted="muted"
// 					poster="${poster}"
// 					src="${source}"
// 				></video>
// 			`.trim()

// 			els = (nativeVideo as HTMLElement)?.querySelector('.native-video-player')
// 			els?.classList.add('lightbox__video-player')

// 			wrapper.innerHTML = template
// 		}

// 		html = wrapper

// 		return { condition, els, html }
// 	}
// }
