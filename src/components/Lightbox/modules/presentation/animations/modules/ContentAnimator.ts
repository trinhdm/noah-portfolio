import { AnimatorFactory } from '../AnimatorFactory.ts'
import { LightboxBlockSelector } from '../../../../utils'
import { BaseAnimator, type AnimatorContext } from '../BaseAnimator.ts'


export class ContentAnimator extends BaseAnimator {
	constructor(ctx: AnimatorContext) {
		super(ctx)
	}

	static { BaseAnimator.register('content', this) }

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


AnimatorFactory.register({
	key: 'content',
	Module: ContentAnimator,
	selectors: ['html'],
	type: 'element',
})


export default ContentAnimator
