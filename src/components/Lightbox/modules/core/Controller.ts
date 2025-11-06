import {
	LightboxContent,
	LightboxMedia,
	LightboxMenu,
	LightboxNavigator,
} from '../features'

import { LightboxAnimator, LightboxDOM, LightboxEvents } from '../presentation'
import { LightboxDispatcher } from './Dispatcher'
import { LightboxFactory } from './Factory'
import { LightboxLifecycle } from './Lifecycle'

import type {
	IContent,
	IMedia,
	IMenu,
	INavigator
} from '../features'

import type { IAnimator, IDOM, IEvents } from '../presentation'
import type { IController, IDispatcher, ILifecycle } from './types/interfaces.d.ts'
import type { LightboxElements, LightboxOptions } from '../../types'


export class LightboxController implements IController {
	private readonly dispatch: IDispatcher
	private readonly root: LightboxElements['root']

	private readonly dom: IDOM
	private readonly events: IEvents
	private readonly animator: IAnimator

	private readonly content: IContent
	private readonly media: IMedia
	private readonly menu: IMenu
	private readonly navigator: INavigator

	private readonly lifecycle: ILifecycle

	constructor(private options: LightboxOptions) {
		this.dispatch = new LightboxDispatcher()
		this.root = new LightboxFactory().createRoot(this.options)

		this.dom = new LightboxDOM(this.root)
		this.events = new LightboxEvents(this.dom, this.dispatch)
		this.animator = new LightboxAnimator(this.dom)

		this.content = new LightboxContent()
		this.media = new LightboxMedia(this.dom, this.dispatch)
		this.menu = new LightboxMenu(this.dom, this.content)
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

	async mount(): Promise<void> { await this.lifecycle.handleMount(this.options) }

	async open(): Promise<void> { await this.dispatch.emit('open') }

	async close(): Promise<void> { await this.dispatch.emit('close') }

	destroy(): void { this.lifecycle.handleDestroy() }
}
