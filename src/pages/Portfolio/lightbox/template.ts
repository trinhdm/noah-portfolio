const template = `
	<div class="lightbox__overlay"></div>
	<div class="lightbox__container">
		<div class="lightbox__header">
			<button class="lightbox__button lightbox__close-button">
				<span>&times;</span>
			</button>
		</div>
		<div class="lightbox__body">
			<div class="lightbox__content"></div>
		</div>
		<div class="lightbox__footer">
			<div class="lightbox__navigation" data-hidden>
				<div class="lightbox__arrow lightbox__arrow--prev">
					<button class="lightbox__button lightbox__prev-button">
						<span>&lsaquo;</span>
					</button>
				</div>
				<div class="lightbox__arrow lightbox__arrow--next">
					<button class="lightbox__button lightbox__next-button">
						<span>&rsaquo;</span>
					</button>
				</div>
			</div>
		</div>
	</div>
`

export default template
