import { EventDispatcher } from '../../../../services'
import { LightboxFactory } from './Factory'
import { LightboxLifecycle } from './Lifecycle'
import { LightboxAnimator, LightboxDOM, LightboxEvents } from '../presentation'

import {
	LightboxContent,
	LightboxMedia,
	LightboxMenu,
	LightboxNavigator,
} from '../features'

import type { LightboxDispatcher, LightboxOptions } from '../../types'


export class LightboxController {
	private readonly content: LightboxContent
	private readonly dispatch: LightboxDispatcher
	private readonly root: HTMLDialogElement

	private readonly dom: LightboxDOM
	private readonly media: LightboxMedia
	private readonly menu: LightboxMenu
	private readonly events: LightboxEvents
	private readonly animator: LightboxAnimator
	private readonly navigator: LightboxNavigator
	private readonly lifecycle: LightboxLifecycle

	constructor(private options: LightboxOptions) {
		this.content = new LightboxContent()
		this.dispatch = new EventDispatcher()
		this.root = new LightboxFactory().createRoot(this.options)

		this.dom = new LightboxDOM(this.root, this.content)
		this.media = new LightboxMedia(this.dom, this.dispatch)
		this.menu = new LightboxMenu(this.dom, this.content)
		this.events = new LightboxEvents(this.dom, this.dispatch)

		this.animator = new LightboxAnimator(this.dom)
		this.navigator = new LightboxNavigator(
			this.dom,
			this.animator,
			this.media,
			this.content,
			this.dispatch
		)

		this.lifecycle = new LightboxLifecycle(
			this.dom,
			this.animator,
			this.events,
			this.media,
			this.menu,
			this.navigator,
			this.content,
			this.dispatch
		)
	}

	async mount() { await this.lifecycle.handleMount(this.options) }

	async open() { await this.dispatch.emit('open') }

	async close() { await this.dispatch.emit('close') }

	destroy(): void { this.lifecycle.handleDestroy() }
}
