import { AnimationService as Animation, AnimationOptions } from '../../../../../services'
import { LightboxBlockSelector, LightboxSelector } from '../../../utils'
import type { FilterValues } from '../../../../../types'
import type { IAnimator, IDOM } from '../types/interfaces'
import type { IState } from '../../core'
import type { LightboxElement, LightboxElements } from '../../../types'


interface AnimatorContext {
	dom: IDOM
	queue: Set<Exclude<LightboxElement, HTMLElement[] | undefined>>
	state: IState
}


abstract class BaseAnimator {
	protected readonly settings = {
		arrows: {
			stagger: .25,
		},
		html: {
			delay: .3,
			stagger: .15,
		},
	}

	protected queue: Set<Exclude<LightboxElement, HTMLElement[] | undefined>>
	protected state: IState
	protected dom: IDOM

	constructor(protected ctx: AnimatorContext) {
		this.queue = ctx.queue
		this.state = ctx.state
		this.dom = ctx.dom
	}

	animate(
		key: keyof FilterValues<LightboxElements, Element[]> | Element | null | undefined,
		options: AnimationOptions = {},
		isPseudo: boolean = false
	): void {
		const target = typeof key === 'string'
			? this.dom.get(key)
			: key as HTMLElement | undefined

		if (!target) return
		this.queue.add(target)

		if (isPseudo) Animation.Pseudo.set(target, options)
		else Animation.set(target, options)
	}

	async waitForFinish(): Promise<void> {
		await new Promise(requestAnimationFrame)

		const queue = Array.from(this.queue),
			root = this.dom.get('root')

		if (!queue.length) return
		await Promise.all(queue.map(el => Animation.waitForEnd(el)))

		if (root.hasAttribute('data-animate'))
			root.removeAttribute('data-animate')

		this.queue.clear()
		this.state.reset('loaded')
		await new Promise(requestAnimationFrame)
	}
}


class ContentAnimator extends BaseAnimator {
	constructor(ctx: AnimatorContext) { super(ctx) }

	fadeBlocks(): void {
		const blocks = this.dom.get('html')
		if (!blocks?.length) return

		const { delay, stagger } = this.settings.html

		const state = this.dom.getData('state'),
			isSwapIn = this.dom.getData('animate') === 'in'

		const stateDelay = {
			close: delay,
			open: 0,
			swap: isSwapIn ? delay : delay * 2,
		}[state]

		const innerDelay = {
			close: 0,
			open: delay + stagger,
			swap: isSwapIn ? delay * 3 : stagger * 1.5,
		}[state]

		const blockList = state === 'open' || isSwapIn ? blocks : blocks.slice().reverse()

		blockList.forEach((block, index) => {
			const base = { index, stagger }
			this.animate(block, { ...base, delay: stateDelay })

			const innerBlock = block.querySelector(LightboxBlockSelector.Animation)
			if (!innerBlock) return
			this.animate(innerBlock, { ...base, delay: innerDelay }, true)
		})
	}
}


class MediaAnimator extends BaseAnimator {
	constructor(ctx: AnimatorContext) { super(ctx) }

	async fadeBlocks(isParallel: boolean = false): Promise<void> {
		console.log('fade media')
		const image = this.dom.get('image'),
			video = this.dom.get('video')

		if (!image || !video) return
		const media = { image, video }

		if (isParallel) await this.fadeParallel(media)
		else await this.fadeSequential(media)
	}

	private async fadeParallel({ image, video }: Pick<LightboxElements, 'image' | 'video'>): Promise<void> {
		this.animate(video)
		this.animate(image)

		const imageDelay = parseFloat(image!.style.animationDelay),
			videoDelay = parseFloat(video!.style.animationDelay),
			slower = imageDelay >= videoDelay ? image : video

		await Animation.waitForEnd(slower)
	}

	private async fadeSequential({ image, video }: Pick<LightboxElements, 'image' | 'video'>): Promise<void> {
		this.animate(video)
		await Animation.waitForEnd(video)

		this.animate(image)
		await Animation.waitForEnd(image)
	}
}


class StructureAnimator extends BaseAnimator {
	constructor(ctx: AnimatorContext) { super(ctx) }

	fadeArrows(isActive: boolean): void {
		const arrows = this.dom.get('arrows')
		if (!arrows?.length) return

		const { stagger } = this.settings.arrows
		const arrowList = isActive ? arrows : arrows.slice().reverse()

		arrowList.forEach((arrow, index) => {
			const icon = arrow.querySelector(LightboxSelector.Icon)
			this.animate(icon, { index, stagger })
		})
	}

	fadeMain(): void {
		this.animate('container')
		this.animate('body')

		if (this.dom.getData('state') === 'close')
			this.dom.setAnimate('overlay')
	}
}


export class LightboxAnimator
extends BaseAnimator implements IAnimator {
	private Content: ContentAnimator
	private Media: MediaAnimator
	private Structure: StructureAnimator

	constructor(
		protected dom: IDOM,
		protected state: IState
	) {
		const queue = new Set<Exclude<LightboxElement, HTMLElement[] | undefined>>(),
			ctx: AnimatorContext = { dom, queue, state }

		super(ctx)

		this.Content = new ContentAnimator(ctx)
		this.Media = new MediaAnimator(ctx)
		this.Structure = new StructureAnimator(ctx)
	}

	async fadeIn(): Promise<void> {
		const targetArrow = this.dom.get('arrows').at(-1),
			targetBlock = this.dom.get('html').at(-1)

		this.dom.setState('open')
		this.dom.setAnimate()

		await this.state.pause('loaded:Content')
		await Animation.wait('pause')

		this.Structure.fadeMain()
		await Animation.waitForEnd(this.dom.get('container'))

		this.Content.fadeBlocks()
		await Animation.waitForEnd(targetBlock)

		this.Structure.fadeArrows(true)
		await Animation.waitForEnd(targetArrow)
		this.animate('exit')

		await this.state.pause('loaded:Media')
		await this.Media.fadeBlocks?.()

		await this.waitForFinish()
	}

	async fadeOut(): Promise<void> {
		const targetArrow = this.dom.get('arrows').at(-1),
			targetBlock = this.dom.get('html').at(-1)

		this.dom.setState('close')
		this.dom.setAnimate()

		this.animate('exit')
		await Animation.wait('pause')

		this.Structure.fadeArrows(false)
		await Animation.waitForEnd(targetArrow)

		this.Content.fadeBlocks()
		await Animation.waitForEnd(targetBlock)

		this.Structure.fadeMain()
		await this.Media.fadeBlocks?.()

		await this.waitForFinish()
	}

	async swap(direction: 'in' | 'out'): Promise<void> {
		this.dom.setAnimate(direction)

		const isMediaAsync = direction === 'out',
			targetBlock = this.dom.get('html').at(isMediaAsync ? -1 : -2)

		this.Content.fadeBlocks()
		this.dom.toggleIcons()
		await Animation.waitForEnd(targetBlock)

		await this.Media.fadeBlocks?.(isMediaAsync)
		await this.waitForFinish()
	}
}
