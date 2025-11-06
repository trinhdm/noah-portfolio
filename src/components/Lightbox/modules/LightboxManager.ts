import { LightboxController } from './core'
import type { IManager, LightboxOptions } from '../types'


export class LightboxManager implements IManager {
	private instance: LightboxController | null = null

	constructor(private options: LightboxOptions) {
		this.instance = null
	}

	async open(index?: number): Promise<void> {
		if (this.instance) await this.instance?.close()

		const { elements } = this.options
		if (typeof index === 'number' && index < elements.length)
			this.options = { elements, index, target: elements[index] }

		const controller = new LightboxController(this.options)
		this.instance = controller

		await controller.mount()
		await controller.open()
	}

	async close(): Promise<void> {
		if (!this.instance) return
		await this.instance?.close()
		this.instance = null
	}
}
