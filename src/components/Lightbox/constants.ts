
enum LightboxClass {
	Root 		= 'lightbox',
	Error 		= `${Root}__error`,

	Body 		= `${Root}__body`,
	Container 	= `${Root}__container`,
	Content 	= `${Root}__content`,
	Footer 		= `${Root}__footer`,
	Header 		= `${Root}__header`,
	Navigation 	= `${Root}__navigation`,
	Overlay 	= `${Root}__overlay`,

	NavItem		= `${Root}__navitem`,
	Control		= `${Root}__control`,
	Icon		= `${Root}__icon`,
	Label 		= `${Root}__label`,
	Html 		= `${Root}__html`,
	Image 		= `${Root}__image`,
	Temp 		= `${Root}__temp`,
	Video 		= `${Root}__video`,
}

enum LightboxSelector {
	Root 		= `.${LightboxClass.Root}`,
	Error 		= `.${LightboxClass.Error}`,

	Body 		= `.${LightboxClass.Body}`,
	Container 	= `.${LightboxClass.Container}`,
	Content 	= `.${LightboxClass.Content}`,
	Footer 		= `.${LightboxClass.Footer}`,
	Header 		= `.${LightboxClass.Header}`,
	Navigation 	= `.${LightboxClass.Navigation}`,
	Overlay 	= `.${LightboxClass.Overlay}`,

	NavItem		= `.${LightboxClass.NavItem}`,
	Control		= `.${LightboxClass.Control}`,
	Icon 		= `.${LightboxClass.Icon}`,
	Label 		= `.${LightboxClass.Label}`,
	Html 		= `.${LightboxClass.Html}`,
	Image 		= `.${LightboxClass.Image}`,
	Temp 		= `.${LightboxClass.Temp}`,
	Video 		= `.${LightboxClass.Video}`,
}

enum LightboxBlockClass {
	Root		= 'fe-block',
	Animation 	= 'block--animated',
}

enum LightboxBlockSelector {
	Root 		= `.${LightboxBlockClass.Root}`,
	Animation 	= `.${LightboxBlockClass.Animation}`,
}

enum LightboxArias {
	labelledby	= 'lightbox-title',
}

enum LightboxAttributes {
	Image		= `[data-sqsp-image-block-image-container]`
}

const LightboxSelectors = {
	Attr: LightboxAttributes,
	Class: {
		Name: {
			Block: LightboxBlockClass,
			Element: LightboxClass,
		},
		Selector: {
			Block: LightboxBlockSelector,
			Element: LightboxSelector,
		},
	},
}



export {
	LightboxArias,
	LightboxBlockClass,
	LightboxBlockSelector,
	LightboxClass,
	LightboxSelector,
	LightboxSelectors,
}
