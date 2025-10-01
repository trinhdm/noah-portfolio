

type NavigationItem = {
	index: number
	target: HTMLElement | null
	text?: HTMLElement
}

type ArrowsGroup = {
	next: NavigationItem
	prev: NavigationItem
}



export type { ArrowsGroup }
