import { AnimatorFactory } from './AnimatorFactory.ts'
import { AnimationService as Animation } from '../../../../services/index.ts'
import { BaseAnimator, type AnimatorContext } from './BaseAnimator.ts'
import type { IAnimator, IDOM } from '../types/interfaces'
import type { IState } from '../../core/types/interfaces'

import './modules/ContentAnimator.ts'
import './modules/MediaAnimator.ts'
import './modules/StructureAnimator.ts'


export class LightboxAnimator extends BaseAnimator
implements IAnimator {
	private Content: BaseAnimator
	private Media: BaseAnimator
	private Structure: BaseAnimator

	private modules: Map<string, BaseAnimator>


	constructor(
		protected args: {
			dom: IDOM,
			// dispatcher: IDispatcher,
			// options: LightboxOptions,
			state: IState,
		}
	) {
		const queue : AnimatorContext['queue']= new Set(),
			ctx: AnimatorContext = { ...args, queue }

		super(ctx)

		this.modules = AnimatorFactory.create(ctx)

		this.Content = this.getModule('content')!
		this.Media = this.getModule('media')!
		this.Structure = this.getModule('structure')!
	}

	getModule<T extends BaseAnimator>(name: string): T {
		return this.modules.get(name) as T
	}

	async fadeIn(): Promise<void> {
		const targetArrow = this.dom.get('arrows').at(-1),
			targetBlock = this.dom.get('html').at(-1)

		this.dom.setState('open')
		this.dom.setAnimate()

		await this.state.pause('loaded:Content')
		// await Animation.wait('pause')

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
