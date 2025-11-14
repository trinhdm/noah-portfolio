import {
	LightboxAnimator,
	LightboxDOM,
	LightboxEvents,
} from '@interface'

import {
	LightboxContent,
	LightboxMedia,
	LightboxNavigator,
} from '@features'

import { LightboxFactory, LightboxLifecycle } from '@core'
import type { IAnimator, IDOM, IEvents } from '@interface'
import type { IContent, IMedia, INavigator } from '@features'
import type { IController, IDispatcher, IState } from '@app'
import type { ILifecycle } from '@core'
import type { LightboxElements, LightboxOptions } from '@lightbox/types'


export class LightboxController implements IController {
	protected readonly dispatcher: IDispatcher
	protected readonly root: LightboxElements['root']

	protected readonly dom: IDOM
	protected readonly animator: IAnimator
	protected readonly events: IEvents
	protected readonly media: IMedia

	protected readonly content: IContent
	protected readonly navigator: INavigator

	protected readonly lifecycle: ILifecycle

	// private readonly dispatcher: IDispatcher
	// private options: LightboxOptions
	// private state: IState

	constructor(
		protected args: {
		dispatcher: IDispatcher,
		options: LightboxOptions,
		state: IState,
	}) {
		this.dispatcher = args.dispatcher
		this.root = new LightboxFactory().createRoot(this.args.options)
		this.dom = new LightboxDOM(this.root)

		const deps = {
			...this.args,
			dom: this.dom,
		}
		this.animator = new LightboxAnimator(deps)
		this.events = new LightboxEvents(deps)
		this.media = new LightboxMedia(deps)

		this.content = new LightboxContent()
		this.navigator = new LightboxNavigator({
			...this.args,
			animator: this.animator,
			content: this.content,
			dom: this.dom,
			media: this.media,
		})

		this.lifecycle = new LightboxLifecycle({
			...this.args,
			animator: this.animator,
			content: this.content,
			dom: this.dom,
			events: this.events,
			media: this.media,
			navigator: this.navigator,
		})
	}

	async mount(): Promise<void> { await this.lifecycle.handleMount() }

	async open(): Promise<void> { await this.dispatcher.emit('open') }

	async close(): Promise<void> { await this.dispatcher.emit('close') }

	destroy(): void { this.lifecycle.handleDestroy() }
}
