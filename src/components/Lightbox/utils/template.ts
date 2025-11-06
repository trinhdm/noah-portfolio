import { LightboxArias, LightboxClass } from './constants'


const template = `
	<div
		aria-hidden="true"
		aria-labelledby="${LightboxArias.labelledby}"
		class="${LightboxClass.Container}"
	>
		<div class="${LightboxClass.Body}">
			<div class="${LightboxClass.Content}"></div>
		</div>
		<div class="${LightboxClass.Footer}">
			<div class="${LightboxClass.Navigation}">
				<div class="${LightboxClass.NavItem}" data-direction="prev">
					<div class="${LightboxClass.Control}">
						<button
							aria-label="Previous Item"
							class="${LightboxClass.Icon}"
							data-icon="arrow-prev"
							disabled
						>
							<span>&lsaquo;</span>
						</button>
						<span class="${LightboxClass.Label}"></span>
					</div>
				</div>
				<div class="${LightboxClass.NavItem}" data-direction="next">
					<div class="${LightboxClass.Control}">
						<span class="${LightboxClass.Label}"></span>
						<button
							aria-label="Next Item"
							class="${LightboxClass.Icon}"
							data-icon="arrow-next"
							disabled
						>
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
			disabled
		>
			<span>&times;</span>
		</button>
	</div>
`.trim()


export default template
