const template = `
	<div class="lightbox__overlay"></div>
	<div class="lightbox__container">
		<div class="lightbox__header">
			<button class="lightbox__icon" data-icon="close">
				<span>&times;</span>
			</button>
		</div>
		<div class="lightbox__body">
			<div class="lightbox__content"></div>
		</div>
		<div class="lightbox__footer">
			<div class="lightbox__navigation">
				<div class="lightbox__navitem" data-direction="prev">
					<div class="lightbox__control">
						<button class="lightbox__icon" data-icon="arrow-prev">
							<span>&lsaquo;</span>
						</button>
						<span class="lightbox__label"></span>
					</div>
				</div>
				<div class="lightbox__navitem" data-direction="next">
					<div class="lightbox__control">
						<span class="lightbox__label"></span>
						<button class="lightbox__icon" data-icon="arrow-next">
							<span>&rsaquo;</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
`.trim()

export default template
