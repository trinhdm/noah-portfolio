import { BaseMedia } from './BaseMedia.ts'
import type { VideoMediaOptions } from '../types/features.types'


export interface AsyncMediaModule<T extends HTMLElement = HTMLElement> {
	default: new (element: T, options?: VideoMediaOptions) => BaseMedia<T>
	isMatch?(element: HTMLElement): boolean
}

export interface SyncMediaModule<T extends HTMLElement = HTMLElement> {
	new (element: T, options?: VideoMediaOptions): BaseMedia<T>
	isMatch?(element: HTMLElement): boolean
}


export class MediaFactory {
	private static asyncModules: (() => Promise<AsyncMediaModule<any>>)[] = []
	private static syncModules: SyncMediaModule<any>[] = []

	private static loaderCache = new Map<
		() => Promise<AsyncMediaModule<any>>, Promise<{ default: SyncMediaModule<any> }>
	>()


	static register<T extends HTMLElement>(module: SyncMediaModule<T>): void {
		this.syncModules.push(module)
	}

	static registerAsync<T extends HTMLElement>(loader: () => Promise<AsyncMediaModule<T>>): void {
		this.asyncModules.push(loader)
	}

	static create<T extends HTMLElement>(
		element: T,
		options?: VideoMediaOptions
	): BaseMedia<T> | undefined {
		for (const Module of this.syncModules) {
			if (Module.isMatch?.(element))
				return new Module(element, options)
		}

		throw new Error(`No matching LightboxMedia Module found for element: ${element.tagName}`)
	}

	static async createAsync<T extends HTMLElement>(
		element: T,
		options?: VideoMediaOptions
	): Promise<BaseMedia<T> | undefined> {
		// const sync = this.create(element, options)
	    // if (sync) return sync

		for (const Module of this.syncModules) {
			if (Module.isMatch?.(element))
				return new Module(element, options)
		}

		for (const loader of this.asyncModules) {
			let cachedLoader = this.loaderCache.get(loader)

			if (!cachedLoader) {
				cachedLoader = loader().then(m => m as { default: SyncMediaModule })
				this.loaderCache.set(loader, cachedLoader)
			}

			const mod = await cachedLoader
		    const Module = mod.default

			if (Module.isMatch?.(element)) {
				this.register(Module)
				return new Module(element, options)
			}
		}

		throw new Error('no matching media handler found')
	}
}
