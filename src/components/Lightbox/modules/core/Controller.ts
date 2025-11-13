import {
	LightboxAnimator,
	LightboxDOM,
	LightboxEvents,
} from '../presentation'

import {
	LightboxContent,
	LightboxMedia,
	LightboxNavigator,
} from '../features'

import { LightboxDispatcher } from './Dispatcher'
import { LightboxFactory } from './Factory'
import { LightboxLifecycle } from './Lifecycle'

import type { IContent, IMedia, INavigator } from '../features'
import type { IAnimator, IDOM, IEvents } from '../presentation'
import type { IController, IDispatcher, ILifecycle, IState } from './types/interfaces.d.ts'
import type { LightboxElements, LightboxOptions } from '../../types'
import type { LightboxEventMap } from './types/core.types.d.ts'


export class LightboxController implements IController {
	private readonly dispatch: IDispatcher
	private readonly root: LightboxElements['root']

	private readonly dom: IDOM
	private readonly animator: IAnimator
	private readonly events: IEvents
	private readonly media: IMedia

	private readonly content: IContent
	private readonly navigator: INavigator

	private readonly lifecycle: ILifecycle

	constructor(
		private options: LightboxOptions,
		private state: IState
	) {
		this.dispatch = new LightboxDispatcher<LightboxEventMap>()
		this.root = new LightboxFactory().createRoot(this.options)

		this.dom = new LightboxDOM(this.root)
		this.animator = new LightboxAnimator(this.dom, this.state)
		this.events = new LightboxEvents(this.dom, this.dispatch)
		this.media = new LightboxMedia(this.dom, this.dispatch)

		this.content = new LightboxContent()
		this.navigator = new LightboxNavigator(
			this.dom,
			this.animator,
			this.media,
			this.content,
			this.dispatch,
			this.state
		)

		this.lifecycle = new LightboxLifecycle(
			this.dom,
			this.animator,
			this.events,
			this.media,
			this.navigator,
			this.content,
			this.dispatch,
			this.state
		)
	}

	async mount(): Promise<void> { await this.lifecycle.handleMount(this.options) }

	async open(): Promise<void> { await this.dispatch.emit('open') }

	async close(): Promise<void> { await this.dispatch.emit('close') }

	destroy(): void { this.lifecycle.handleDestroy() }
}
