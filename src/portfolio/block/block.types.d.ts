

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
	navigation: ArrowsGroup & {
		current: NavigationItem
	}
}


export type {
	ArrowsGroup,
	BlockOptions,
}
