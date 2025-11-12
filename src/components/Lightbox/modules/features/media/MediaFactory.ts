import { BaseMedia } from './BaseMedia.ts'
import type { VideoMediaOptions } from '../types/features.types'


export interface MediaModule<T extends HTMLElement = HTMLElement> {
	default: new (element: T, options?: VideoMediaOptions) => BaseMedia<T>
	isMatch(element: HTMLElement): boolean
}

export class MediaFactory {
	private static modules: (() => Promise<MediaModule<any>>)[] = []

	static register<T extends HTMLElement>(loader: () => Promise<MediaModule<T>>): void {
		this.modules.push(loader)
	}

	static async create<T extends HTMLElement>(
		element: T,
		options?: VideoMediaOptions
	): Promise<BaseMedia<T> | undefined> {
		// const modules = await Promise.all(this.modules.map(load => load()))

		for (const load of this.modules) {
			const module = await load()

			if (module.isMatch(element)) {
				const MediaClass = module.default
				return new MediaClass(element, options)
			}
		}

		throw new Error('no matching media handler found')
	}
}
