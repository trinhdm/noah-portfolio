import { AnimationService as Animation } from '../../../../../services'
import { LightboxSelector } from '../../../utils'
import { LightboxContent, LightboxMedia } from '../content'
import { LightboxAnimator, LightboxDOM } from '../../presentation'
import type { FilterValues } from '../../../../../types'

import type {
	ArrowDirections,
	ArrowGroup,
	LightboxDispatcher,
	LightboxElements,
} from '../../../types'


export class LightboxNavigator {
	private readonly delay: number = 250
	private isSwapping = false
	private pendingContent: HTMLElement | undefined

	constructor(
		private dom: LightboxDOM,
		private animator: LightboxAnimator,
		private media: LightboxMedia,
		private content: LightboxContent,
		private dispatch: LightboxDispatcher
	) {}

	private async setSwap<T extends ArrowDirections>(
		target: NonNullable<ArrowGroup[T]['target']>,
		element: keyof FilterValues<LightboxElements, Element[]> = 'image'
	) {
		const content = await this.content.render(target),
			key = element.charAt(0).toUpperCase() + element.slice(1),
			selector = LightboxSelector[key as keyof typeof LightboxSelector]

		if (content && selector) {
			const currentEl = this.dom.get(element),
				newEl = content.querySelector(selector)

			if (currentEl && newEl) {
				this.pendingContent = content
				currentEl.replaceWith(newEl)
				this.dom.reset(element)
			}
		}
	}

	private async beginSwap() {
		this.media.pause()

		this.dom.toggleDisable()
		this.dom.setState('swap')
		await Animation.wait(this.delay)
	}

	private async performSwap() {
		await this.animator.swap('out')
		this.dom.updateContent(this.pendingContent)
		this.media.load()
		await this.animator.swap('in')
	}

	private async finishSwap(index: number) {
		await this.dispatch.emit('update', index)

		await Animation.wait(this.delay)
		this.dom.setState('open')
		this.dom.toggleDisable()

		this.media.play()
	}

	async swapContent<T extends ArrowDirections>(
		directory: ArrowGroup,
		dir: T
	) {
		const { index, target } = directory[dir]
		if (this.isSwapping || !target) return

		this.isSwapping = true
		await this.setSwap<T>(target)

		if (!this.pendingContent) return

		const message = 'LightboxNavigator.swapContent() failed'
		const timeline = [
			() => this.beginSwap(),
			() => this.performSwap(),
			() => this.finishSwap(index),
		]

		for (const step of timeline)
			await step().catch(error => this.dispatch.emit('error', { error, message }))

		this.isSwapping = false
	}
}
