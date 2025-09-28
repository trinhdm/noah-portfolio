const template = `
	<div class="lightbox__overlay"></div>
	<div class="lightbox__container">
		<div class="lightbox__header">
			<button class="lightbox__button lightbox__close">
				<span>&times;</span>
			</button>
		</div>
		<div class="lightbox__body">
			<div class="lightbox__content"></div>
		</div>
		<div class="lightbox__footer">
			<div class="lightbox__navigation">
				<div class="lightbox__arrow lightbox__arrow--left">
					<button class="lightbox__button lightbox__prev">
						<span>&lsaquo;</span>
					</button>
				</div>
				<div class="lightbox__arrow lightbox__arrow--right">
					<button class="lightbox__button lightbox__next">
						<span>&rsaquo;</span>
					</button>
				</div>
			</div>
		</div>
	</div>
`

export default template
