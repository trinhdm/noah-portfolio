

export type BlockHandler = (block: HTMLElement) => HTMLElement | null


export interface VideoMediaOptions {
	controls?: boolean
	loop?: boolean
	muted?: boolean
	[key: string]: boolean | number | string
}
