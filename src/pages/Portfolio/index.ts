import { findElement } from '../../utils/dom.ts'
import { stylePageHeaderBlock } from '../../components/Block/helpers'
import { BlockPortfolio } from './BlockPortfolio.ts'
import { ContentService } from '../../services'
import { LightboxManager } from '../../components/Lightbox'
import './portfolio.css'


class Portfolio {
	private static readonly className = 'portfolio-block'
	private static readonly selector = '.fluid-image-container'

	private static blocks: HTMLElement[] = []
	private static instances: BlockPortfolio[] = []
	private static lightbox: LightboxManager | null = null

	private static content: ContentService
	private static handler?: (event: MouseEvent) => void

	static async init() {
		stylePageHeaderBlock(this.selector, this.className)

		this.blocks = this.getBlocks(document.querySelectorAll(this.selector))
		this.instances = await this.createInstances(this.blocks)
		this.bindEvents()

		Promise.all(this.blocks.map(block => BlockPortfolio.watch(block)))
	}

	static async destroy() {
		if (this.lightbox) this.resetLightbox()
		this.unbindEvents()

		this.blocks = []
		this.instances = []
	}

	private static getBlocks(elements: NodeListOf<HTMLElement>) {
		return Array.from(elements).map(el => findElement(el)).filter(Boolean) as HTMLElement[]
	}

	private static async createInstances(blocks: HTMLElement[]) {
		this.content = new ContentService()
		return Promise.all(blocks.map((block, index) =>
			BlockPortfolio.init({
				className: this.className,
				index,
				target: block,
			}, this.content)
		))
	}

	private static async handleClick(event: MouseEvent) {
		const target = findElement(event.target as HTMLElement)
		if (!target || !target.className.includes(this.className)) return

		const element = this.instances.find(({ block }) => block === target)
		if (!element) return

		event.preventDefault()
		if (this.lightbox) this.resetLightbox()

		this.lightbox = new LightboxManager({
			...element.toLightboxOptions(),
			elements: this.blocks,
			properties: { id: `lightbox-${element?.id}` }
		})

		await this.lightbox.open()
	}

	private static bindEvents() {
		this.handler = (event: MouseEvent) => this.handleClick(event)
		document.body.addEventListener('click', this.handler)
	}

	private static unbindEvents() {
		if (!this.handler) return
		document.body.removeEventListener('click', this.handler)
		this.handler = undefined
	}

	private static async resetLightbox() {
		await this.lightbox?.close()
		this.lightbox = null
	}
}


export { Portfolio }
