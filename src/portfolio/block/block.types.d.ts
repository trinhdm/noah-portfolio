

type NavigationItem = {
	index: number
	target: HTMLElement | null
	text?: HTMLElement
}

type ArrowsGroup = {
	next: NavigationItem
	prev: NavigationItem
}

type BlockOptions = {
	className: string
	index: number
	target: HTMLElement
}


export type {
	ArrowsGroup,
	BlockOptions,
}
