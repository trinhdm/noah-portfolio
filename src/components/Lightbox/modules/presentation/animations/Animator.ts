import { AnimationService as Animation, AnimationOptions } from '../../../../../services'
import { LightboxBlockSelector, LightboxSelector } from '../../../utils'
import type { FilterValues } from '../../../../../types'
import type { IAnimator, IDOM } from '../types/interfaces'
import type { LightboxElement, LightboxElements } from '../../../types'


export class LightboxAnimator implements IAnimator {
	private queue = new Set<Exclude<LightboxElement, HTMLElement[] | undefined>>()

	private readonly settings = {
		html: {
			delay: .3,
			stagger: .15,
		}
	}

	Media: InstanceType<typeof LightboxAnimator.Media>
	Root: InstanceType<typeof LightboxAnimator.Root>

	constructor(private dom: IDOM) {
		this.Media = new LightboxAnimator.Media(this)
		this.Root = new LightboxAnimator.Root(this)
	}

	async swap(direction: 'in' | 'out'): Promise<void> {
		this.dom.setAnimate(direction)

		const isMediaAsync = direction === 'out',
			targetBlock = this.dom.get('html').at(isMediaAsync ? -1 : -2)

		this.fadeTextBlocks()
		this.dom.toggleIcons()
		await Animation.waitForEnd(targetBlock)

		await this.Media.fadeMediaBlocks?.(isMediaAsync)
		await this.waitForFinish()
	}

	private animate(
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

	private async waitForFinish(): Promise<void> {
		await new Promise(requestAnimationFrame)

		const queue = Array.from(this.queue),
			root = this.dom.get('root')

		if (!queue.length) return
		await Promise.all(queue.map(el => Animation.waitForEnd(el)))
		console.warn('all fin')

		if (root.hasAttribute('data-animate'))
			root.removeAttribute('data-animate')

		this.queue.clear()
	}

	private fadeArrows(isActive: boolean): void {
		const arrows = this.dom.get('arrows')
		if (!arrows?.length) return

		const arrowList = isActive ? arrows : arrows.slice().reverse()

		arrowList.forEach((arrow, index) => {
			const icon = arrow.querySelector(LightboxSelector.Icon)
			this.animate(icon, { index, stagger: .25 })
		})
	}

	private fadeTextBlocks(): void {
		const blocks = this.dom.get('html')
		if (!blocks?.length) return

		const delay = .3,
			stagger = .15

		const state = this.dom.getData('state'),
			isSwapIn = state === 'swap' && this.dom.getData('animate') === 'in'

		const stateDelay = {
			close: delay,
			open: 0,
			swap: isSwapIn ? delay : delay * 3,
		}[state]

		const innerDelay = {
			close: 0,
			open: delay + stagger,
			swap: isSwapIn ? delay * 3 : delay + stagger,
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

	static Media = class {
		private dom: IDOM

		constructor(private animator: LightboxAnimator) {
			this.animator = animator
			this.dom = this.animator.dom
		}

		private async fadeParallel({ image, video }: Pick<LightboxElements, 'image' | 'video'>): Promise<void> {
			this.animator.animate(video)
			this.animator.animate(image)

			const imageDelay = parseFloat(image!.style.animationDelay),
				videoDelay = parseFloat(video!.style.animationDelay),
				slower = imageDelay >= videoDelay ? image : video

			await Animation.waitForEnd(slower)
		}

		private async fadeSequential({ image, video }: Pick<LightboxElements, 'image' | 'video'>): Promise<void> {
			this.animator.animate(video)
			await Animation.waitForEnd(video)

			this.animator.animate(image)
			await Animation.waitForEnd(image)
		}

		async fadeMediaBlocks(isParallel: boolean = false): Promise<void> {
			const image = this.dom.get('image'),
				video = this.dom.get('video')

			if (!image || !video) return
			const media = { image, video }

			if (isParallel) await this.fadeParallel(media)
			else await this.fadeSequential(media)
		}
	}

	static Root = class {
		private dom: IDOM

		constructor(private animator: LightboxAnimator) {
			this.animator = animator
			this.dom = this.animator.dom
		}

		private fadeMain(): void {
			this.animator.animate('container')
			this.animator.animate('body')

			if (this.dom.getData('state') === 'close')
				this.dom.setAnimate('overlay')
		}

		async fadeIn(): Promise<void> {
			const targetBlock = this.dom.get('html').at(-1)

			this.dom.setState('open')
			this.dom.setAnimate()

			await Animation.wait('pause')
			this.fadeMain()
			await Animation.waitForEnd(this.dom.get('container'))

			this.animator.fadeTextBlocks()
			await Animation.waitForEnd(targetBlock)

			this.animator.fadeArrows(true)
			await this.animator.Media.fadeMediaBlocks?.()
			this.animator.animate('exit')

			await this.animator.waitForFinish()
		}

		async fadeOut(): Promise<void> {
			const targetArrow = this.dom.get('arrows').at(-1),
				targetBlock = this.dom.get('html').at(-1)

			this.dom.setState('close')
			this.dom.setAnimate()

			this.animator.animate('exit')
			await Animation.wait('pause')

			this.animator.fadeArrows(false)
			await Animation.waitForEnd(targetArrow)

			this.animator.fadeTextBlocks()
			await Animation.waitForEnd(targetBlock)

			this.fadeMain()
			await this.animator.Media.fadeMediaBlocks?.()

			await this.animator.waitForFinish()
		}
	}
}
