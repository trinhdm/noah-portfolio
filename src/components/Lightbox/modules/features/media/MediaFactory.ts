
import { BaseMedia } from './BaseMedia.ts'
import type { VideoMediaOptions } from '../types/features.types'


export interface MediaModule<T extends HTMLElement = HTMLElement> {
	new (element: T, options?: VideoMediaOptions): BaseMedia<T>
	isMatch?(element: T): boolean
}

export type AsyncLoader<T extends HTMLElement = HTMLElement> = () => Promise<
	{ default: MediaModule<T> }
>


export class MediaFactory {
	private static asyncModules = new Set<AsyncLoader<any>>()
	private static syncModules = new Set<MediaModule<any>>()

	private static loaderCache = new Map<
		AsyncLoader<any>, Promise<{ default: MediaModule<any> }>
	>()

	static register<T extends HTMLElement>(loader: AsyncLoader<T>): void
	static register<T extends HTMLElement>(Module: MediaModule<T>): void
	static register(arg: any): void {
		if (typeof arg === 'function' && 'prototype' in arg)
			this.syncModules.add(arg as MediaModule<any>)
		else if (typeof arg === 'function')
			this.asyncModules.add(arg as AsyncLoader<any>)
		else
			throw new TypeError('invalid argument passed to MediaFactory.register()')
	}

	static async create<T extends HTMLElement>(
		element: T,
		options?: VideoMediaOptions
	): Promise<InstanceType<MediaModule<T>>> {
		for (const Module of this.syncModules) {
			if (Module.isMatch?.(element))
				return new Module(element, options)
		}

		for (const loader of this.asyncModules) {
			let modLoader = this.loaderCache.get(loader)

			if (!modLoader) {
				modLoader = loader().then(m => m as { default: MediaModule })
				this.loaderCache.set(loader, modLoader)
			}

			const mod = await modLoader,
				Module = mod.default

			if (Module.isMatch?.(element)) {
				this.register(Module)
				return new Module(element, options)
			}
		}

		throw new Error(`no matching MediaModule found for element: ${element.tagName}`)
	}
}
