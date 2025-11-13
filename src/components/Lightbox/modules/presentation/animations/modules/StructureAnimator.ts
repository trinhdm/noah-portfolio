import { AnimatorFactory } from '../AnimatorFactory.ts'
import { LightboxSelector } from '../../../../utils/index.ts'
import { BaseAnimator, type AnimatorContext } from '../BaseAnimator.ts'


export class StructureAnimator extends BaseAnimator {
	constructor(ctx: AnimatorContext) {
		super(ctx)
	}

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

	static { BaseAnimator.register('structure', this) }
}


AnimatorFactory.register({
	key: 'structure',
	Module: StructureAnimator,
	selectors: ['arrows', 'body', 'container'],
	type: 'element',
})


export default StructureAnimator
