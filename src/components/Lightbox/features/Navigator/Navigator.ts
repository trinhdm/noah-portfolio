import { AnimationService as Animation } from '../../../../services'
import { LightboxMenu } from './Menu.ts'
import { LightboxSelector } from '@lightbox/utils'
import type { FilterValues } from '../../../../types'
import type { IAnimator, IDOM } from '@interface'
import type { IContent, IMedia, INavigator } from '@features'
import type { IDispatcher, IState } from '@app'
import type { LightboxElements, LightboxOptions } from '@lightbox/types'


interface NavigatorContext {
	content: IContent
	dom: IDOM
}

export class LightboxNavigator extends LightboxMenu
implements INavigator {
	protected readonly animator: IAnimator
	protected readonly content: IContent
	protected readonly dispatcher: IDispatcher
	protected readonly dom: IDOM
	protected readonly media: IMedia
	protected readonly state: IState

	private readonly delay: number = 500
	private isSwapping = false

	constructor(
		protected args: {
			animator: IAnimator,
			content: IContent,
			dispatcher: IDispatcher,
			dom: IDOM,
			media: IMedia,
			state: IState,
			// options: LightboxOptions,
		}
	) {
		const ctx: NavigatorContext = { ...args }
		super(ctx)

		this.animator = args.animator
		this.content = args.content
		this.dispatcher = args.dispatcher
		this.dom = args.dom
		this.media = args.media
		this.state = args.state

		this.state.bind(this, 'isSwapping')
	}

	private async setSwap(
		target: NonNullable<LightboxOptions['target']>,
		element: keyof FilterValues<LightboxElements, Element[]> = 'image'
	): Promise<HTMLElement | undefined> {
		const content = await this.content.render(target),
			key = element.charAt(0).toUpperCase() + element.slice(1),
			selector = LightboxSelector[key as keyof typeof LightboxSelector]

		if (content && selector) {
			const currentEl = this.dom.get(element),
				newEl = content.querySelector(selector)

			if (currentEl && newEl) {
				currentEl.replaceWith(newEl)
				this.dom.reset(element)
			}
		}

		return content
	}

	private async beginSwap(): Promise<void> {
		this.media.pause()

		this.dom.toggleDisable()
		this.dom.setState('swap')
		await Animation.wait(this.delay)
	}

	private async performSwap(content: HTMLElement): Promise<void> {
		await this.animator.swap('out')

		this.dom.setContent(content)
		await this.media.load()
		this.state.update('loaded:Content', true)

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

		const scontent = await this.setSwap(target)
		if (!scontent || !scontent.childElementCount) return

		const message = 'LightboxNavigator.swapContent() failed'
		const timeline = [
			() => this.beginSwap(),
			() => this.performSwap(scontent),
			() => this.finishSwap(),
		]

		for (const step of timeline)
			await step().catch(error => this.dispatcher.emit('error', { error, message }))

		this.isSwapping = false
	}
}
