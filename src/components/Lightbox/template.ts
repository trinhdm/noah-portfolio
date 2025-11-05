import { LightboxArias, LightboxClass } from './constants'


const template = `
	<div class="${LightboxClass.Overlay}"></div>
	<div
		aria-labelledby="${LightboxArias.labelledby}"
		aria-modal="true"
		class="${LightboxClass.Container}"
		role="dialog"
	>
		<div class="${LightboxClass.Header}"></div>
		<div class="${LightboxClass.Body}">
			<div class="${LightboxClass.Content}"></div>
		</div>
		<div class="${LightboxClass.Footer}">
			<div class="${LightboxClass.Navigation}">
				<div class="${LightboxClass.NavItem}" data-direction="prev">
					<div class="${LightboxClass.Control}">
						<button class="${LightboxClass.Icon}" data-icon="arrow-prev">
							<span>&lsaquo;</span>
						</button>
						<span class="${LightboxClass.Label}"></span>
					</div>
				</div>
				<div class="${LightboxClass.NavItem}" data-direction="next">
					<div class="${LightboxClass.Control}">
						<span class="${LightboxClass.Label}"></span>
						<button class="${LightboxClass.Icon}" data-icon="arrow-next">
							<span>&rsaquo;</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="lightbox__exit">
		<button
			aria-label="Close"
			class="${LightboxClass.Icon}"
			data-icon="close"
		>
			<span>&times;</span>
		</button>
	</div>
`.trim()


export default template
