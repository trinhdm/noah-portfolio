import type { ArrowsGroup } from '../block/block.types'
import type { PageGroup } from '../../../global/utils.types'


type WithoutEmpty<T> = T extends T ? {} extends T ? never : T : never

type LightboxOptions <T extends HTMLElement = HTMLDivElement> = {
	content: T | undefined
	navigation: ArrowsGroup | {}
	properties: Record<keyof T, T[keyof T]> | {}
}

type LightboxContentOptions = {
	elements: NodeListOf<HTMLElement>
	index: number | undefined
	page: PageGroup | undefined
}


type NavigationOptions = WithoutEmpty<LightboxOptions['navigation']>


export type {
	LightboxContentOptions,
	LightboxOptions,
	NavigationOptions,
}
