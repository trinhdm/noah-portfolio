import { AnimationService as Animation, AnimationOptions } from '../../../../services'
import { FilterValues } from '../../../../types'
import { LightboxDOM } from './DOM'
import { LightboxBlockSelector, LightboxSelector } from '../../utils'
import type { LightboxElement, LightboxElements } from '../../types'


export class LightboxAnimator {
	private queue = new Set<Exclude<LightboxElement, HTMLElement[]>>()

	Media: InstanceType<typeof LightboxAnimator.Media>
	Root: InstanceType<typeof LightboxAnimator.Root>

	constructor(private dom: LightboxDOM) {
		this.Media = new LightboxAnimator.Media(this)
		this.Root = new LightboxAnimator.Root(this)
	}

	async swap(direction: 'in' | 'out') {
		this.dom.setAnimate(direction)

		const isMediaAsync = direction === 'out',
			targetBlock = this.dom.get('html').at(isMediaAsync ? -1 : -2)

		this.fadeTextBlocks()
		this.dom.toggleIcons()
		await this.waitForEnd(targetBlock)

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

	private async waitForEnd(target: HTMLElement | undefined) {
		if (!target) return
		this.queue.delete(target)
		await Animation.waitForEnd(target)
	}

	private async waitForFinish() {
		await new Promise(requestAnimationFrame)

		const animations = Array.from(this.queue),
			root = this.dom.get('root')

		if (!animations.length) return
		await Promise.allSettled(
			animations.map(el => el ? Animation.waitForEnd(el) : Promise.resolve())
		)
		this.queue.clear()

		if (root.hasAttribute('data-animate'))
			root.removeAttribute('data-animate')
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
		private dom: LightboxDOM

		constructor(private animator: LightboxAnimator) {
			this.animator = animator
			this.dom = this.animator.dom
		}

		private async fadeParallel({ image, video }: Pick<LightboxElements, 'image' | 'video'>) {
			this.animator.animate(video)
			this.animator.animate(image)

			const imageDelay = parseFloat(image!.style.animationDelay),
				videoDelay = parseFloat(video!.style.animationDelay),
				slower = imageDelay >= videoDelay ? image : video

			await this.animator.waitForEnd(slower)
		}

		private async fadeSequential({ image, video }: Pick<LightboxElements, 'image' | 'video'>) {
			this.animator.animate(video)
			await this.animator.waitForEnd(video)

			this.animator.animate(image)
			await this.animator.waitForEnd(image)
		}

		async fadeMediaBlocks(isAsync: boolean = false) {
			const image = this.dom.get('image'),
				video = this.dom.get('video')

			if (!image || !video) return
			const media = { image, video }

			if (isAsync) await this.fadeParallel(media)
			else await this.fadeSequential(media)
		}
	}

	static Root = class {
		private dom: LightboxDOM

		constructor(private animator: LightboxAnimator) {
			this.animator = animator
			this.dom = this.animator.dom
		}

		private fadeMain() {
			this.animator.animate('container')
			this.animator.animate('body')

			if (this.dom.getData('state') === 'close')
				this.dom.setAnimate('overlay')
		}

		async fadeIn() {
			const targetBlock = this.dom.get('html').at(-1)

			this.dom.setState('open')
			this.dom.setAnimate()

			await Animation.wait('pause')
			this.fadeMain()
			await this.animator.waitForEnd(this.dom.get('container'))

			this.animator.fadeTextBlocks()
			await this.animator.waitForEnd(targetBlock)

			this.animator.fadeArrows(true)
			await this.animator.Media.fadeMediaBlocks?.()
			this.animator.animate('exit')

			await this.animator.waitForFinish()
		}

		async fadeOut() {
			const targetArrow = this.dom.get('arrows').at(-1),
				targetBlock = this.dom.get('html').at(-1)

			this.dom.setState('close')
			this.dom.setAnimate()

			this.animator.animate('exit')
			await Animation.wait('pause')

			this.animator.fadeArrows(false)
			await this.animator.waitForEnd(targetArrow)

			this.animator.fadeTextBlocks()
			await this.animator.waitForEnd(targetBlock)

			this.fadeMain()
			await this.animator.Media.fadeMediaBlocks?.()

			await this.animator.waitForFinish()
		}
	}
}
