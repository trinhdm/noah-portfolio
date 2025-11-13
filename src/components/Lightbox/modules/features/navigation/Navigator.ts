import { AnimationService as Animation } from '../../../../../services'
import { LightboxMenu } from './Menu.ts'
import { LightboxSelector } from '../../../utils'
import type { FilterValues } from '../../../../../types'
import type { IAnimator, IDOM } from '../../presentation'
import type { IContent, IMedia, INavigator } from '../types/interfaces.d.ts'
import type { IDispatcher, IState } from '../../core'
import type { LightboxElements, LightboxOptions } from '../../../types'


export class LightboxNavigator
extends LightboxMenu implements INavigator {
	private readonly delay: number = 500
	private isSwapping = false
	private pendingContent: HTMLElement | undefined

	constructor(
		protected dom: IDOM,
		private animator: IAnimator,
		private media: IMedia,
		protected content: IContent,
		private dispatch: IDispatcher,
		private state: IState
	) {
		super(dom, content)
		this.state.bind(this, 'isSwapping')
	}

	private async setSwap(
		target: NonNullable<LightboxOptions['target']>,
		element: keyof FilterValues<LightboxElements, Element[]> = 'image'
	): Promise<void> {
		const content = await this.content.render(target),
			key = element.charAt(0).toUpperCase() + element.slice(1),
			selector = LightboxSelector[key as keyof typeof LightboxSelector]

		if (content && selector) {
			const currentEl = this.dom.get(element),
				newEl = content.querySelector(selector)

			if (currentEl && newEl) {
				currentEl.replaceWith(newEl)
				this.dom.reset(element)

				this.pendingContent = content
			}
		}
	}

	private async beginSwap(): Promise<void> {
		this.media.pause()

		this.dom.toggleDisable()
		this.dom.setState('swap')
		await Animation.wait(this.delay)
	}

	private async performSwap(): Promise<void> {
		await this.animator.swap('out')
		console.log('pendingContent', this.pendingContent)
		this.dom.setContent(this.pendingContent)
		this.media.load()
		await this.animator.swap('in')
	}

	private async finishSwap(): Promise<void> {
		await Animation.wait(this.delay)
		this.dom.setState('open')
		this.dom.toggleDisable()

		this.media.play()
	}

	async swapContent(target: LightboxOptions['target']): Promise<void> {
		if (this.isSwapping || !target) return

		this.isSwapping = true

		await this.setSwap(target)
		if (!this.pendingContent?.children) return

		const message = 'LightboxNavigator.swapContent() failed'
		const timeline = [
			() => this.beginSwap(),
			() => this.performSwap(),
			() => this.finishSwap(),
		]

		for (const step of timeline)
			await step().catch(error => this.dispatch.emit('error', { error, message }))

		this.isSwapping = false
	}
}
