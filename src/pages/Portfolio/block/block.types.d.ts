

type NavigationItem = {
	index: number
	target: HTMLElement | null
	text?: HTMLElement
}

type ArrowsGroup = {
	next: NavigationItem
	prev: NavigationItem
}

type DirectionsList = keyof ArrowsGroup



export type { ArrowsGroup, DirectionsList }
