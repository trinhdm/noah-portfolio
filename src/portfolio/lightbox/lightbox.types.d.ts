import type { ArrowsGroup } from '../block/block.types'


type WithoutEmpty<T> = T extends T ? {} extends T ? never : T : never

type LightboxOptions <T extends HTMLElement = HTMLDivElement> = {
	content: T | undefined
	navigation: ArrowsGroup | {}
	properties: Record<keyof T, T[keyof T]> | {}
}

type NavigationOptions = WithoutEmpty<LightboxOptions['navigation']>


export type {
	LightboxOptions,
	NavigationOptions,
}
