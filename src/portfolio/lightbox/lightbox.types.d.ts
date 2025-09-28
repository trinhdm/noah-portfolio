
type ArrowsGroup =  {
	next: string
	prev: string
}

type LightboxGroup <T extends HTMLElement = HTMLDivElement> = {
	// activeClass: string
	content: string
	index: number
	// isActive: boolean
	// lightbox: HTMLDivElement
	navigation: {} | ArrowsGroup
	properties: {} | Record<keyof T, T[keyof T]>
}

type CreateGroup = Pick<LightboxGroup,'properties'>['properties']
// type NavigateGroup = Pick<LightboxGroup, 'index' | 'lightbox' | 'navigation'>
// type ResetGroup = Pick<LightboxGroup, 'activeClass' | 'isActive' | 'lightbox'>
type SetupGroup = Pick<LightboxGroup, 'content' | 'index' | 'navigation' | 'properties'>
// type ToggleGroup = Pick<LightboxGroup, 'lightbox'>

export type {
	ArrowsGroup,
	CreateGroup,
	SetupGroup,
}
