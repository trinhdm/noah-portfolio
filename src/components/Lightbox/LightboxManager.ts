import { LightboxController, LightboxDispatcher, LightboxState } from './core'
import type { IController, IDispatcher, IState } from './core'
import type { IManager, LightboxOptions } from './types'
import type { LightboxEventMap } from './core/types/core.types'


export class LightboxManager implements IManager {
	protected readonly controller: IController
	protected readonly dispatcher: IDispatcher
	protected readonly state: IState
	private instance: LightboxController | null = null

	constructor(private options: LightboxOptions) {
		this.dispatcher = new LightboxDispatcher<LightboxEventMap>()
		this.state = new LightboxState()

		this.controller = new LightboxController({
			dispatcher: this.dispatcher,
			options: this.options,
			state: this.state,
		})
	}

	async initialize(): Promise<LightboxController | null> {
		if (this.instance) await this.instance?.close()
		else if (!this.controller) return null

		this.instance = this.controller as LightboxController
		await this.instance?.mount()

		return this.instance
	}

	async open(index?: number): Promise<void> {
		const { elements } = this.options
		if (typeof index === 'number' && index < elements.length)
			this.options = { elements, index, target: elements[index] }

		await this.instance?.open()
		// await this.controller.mount()
	}

	async close(): Promise<void> {
		if (!this.instance) return
		await this.instance?.close()
		this.instance = null

		this.state.clear()
		this.dispatcher.clear()
		this.controller.destroy()
	}
}
