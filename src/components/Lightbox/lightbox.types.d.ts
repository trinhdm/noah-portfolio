
enum LightboxClass {
	Root 		= 'lightbox',
	Animation 	= `${Root}--animated`,
	Body 		= `${Root}__body`,
	Close 		= `${Root}__close`,
	Container 	= `${Root}__container`,
	Content 	= `${Root}__content`,
	Navigation 	= `${Root}__navigation`,
	Overlay 	= `${Root}__overlay`,

	Label 		= `${Root}__label`,
	Html 		= `${Root}__html`,
	Image 		= `${Root}__image`,
	Temp 		= `${Root}__temp`,
	Video 		= `${Root}__video`,
}

enum LightboxSelector {
	Root 		= `.${LightboxClass.Root}`,
	Animation 	= `.${LightboxClass.Animation}`,
	Body 		= `.${LightboxClass.Body}`,
	Close 		= `.${LightboxClass.Close}`,
	Container 	= `.${LightboxClass.Container}`,
	Content 	= `.${LightboxClass.Content}`,
	Navigation 	= `.${LightboxClass.Navigation}`,
	Overlay 	= `.${LightboxClass.Overlay}`,

	Html 		= `.${LightboxClass.Html}`,
	Label 		= `.${LightboxClass.Label}`,
	Image 		= `.${LightboxClass.Image}`,
	Temp 		= `.${LightboxClass.Temp}`,
	Video 		= `.${LightboxClass.Video}`,
}

enum LightboxBlockClass {
	Root		= 'block',
	Block		= 'fe-block',
	Animation 	= `${Root}--animated`,
}

enum LightboxBlockSelector {
	Root 		= `.${LightboxBlockClass.Root}`,
	Block		= `.${LightboxBlockClass.Block}`,
	Animation 	= `.${LightboxBlockClass.Animation}`,
}


type LightboxElements = {
	arrows: NodeListOf<HTMLElement> | undefined
	blocks: NodeListOf<HTMLElement> | undefined
	body: HTMLElement | undefined
	close: HTMLElement | undefined
	container: HTMLElement | undefined
	content: HTMLDivElement | undefined
	image?: HTMLImageElement | undefined
	navigation: HTMLElement | undefined
	overlay: HTMLElement | undefined
	root: HTMLDivElement
	video?: HTMLIFrameElement | HTMLVideoElement | undefined
}

type LightboxOptions = {
	elements: HTMLElement[]
	index: number
	properties?: LightboxProperties
	target: Node
}

type LightboxEventMap = {
	close: void
	navigate: ArrowDirections
	open: void
	ready: LightboxOptions
	update: number
}

type LightboxStates = 'open' | 'change' | 'close'


type NavigationItem = {
	content?: string
	id?: string
	index: number
	target: HTMLElement | null
	title?: string
	url?: string
}

type ArrowGroup = {
	next: NavigationItem
	prev: NavigationItem
}

type ArrowDirections = keyof ArrowGroup



export {
	LightboxBlockSelector,
	LightboxClass,
	LightboxSelector,
}

export type {
	ArrowGroup,
	ArrowDirections,
	LightboxElements,
	LightboxEventMap,
	LightboxOptions,
	LightboxStates,
}
