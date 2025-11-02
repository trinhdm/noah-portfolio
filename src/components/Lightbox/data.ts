
enum LightboxClass {
	Root 		= 'lightbox',
	Animation 	= `${Root}--animated`,
	Body 		= `${Root}__body`,
	Close 		= `${Root}__close`,
	Container 	= `${Root}__container`,
	Content 	= `${Root}__content`,
	Footer 		= `${Root}__footer`,
	Header 		= `${Root}__header`,
	Navigation 	= `${Root}__navigation`,
	Overlay 	= `${Root}__overlay`,

	Icon		= `${Root}__icon`,
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
	Footer 		= `.${LightboxClass.Footer}`,
	Header 		= `.${LightboxClass.Header}`,
	Navigation 	= `.${LightboxClass.Navigation}`,
	Overlay 	= `.${LightboxClass.Overlay}`,

	Icon 		= `.${LightboxClass.Icon}`,
	Label 		= `.${LightboxClass.Label}`,
	Html 		= `.${LightboxClass.Html}`,
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


export {
	LightboxBlockSelector,
	LightboxClass,
	LightboxSelector,
}
