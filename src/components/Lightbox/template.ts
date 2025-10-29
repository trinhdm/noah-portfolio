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
			<div class="pagination lightbox__pagination">
				<div class="lightbox__arrow lightbox__arrow--prev pagination__prev" data-direction="prev">
					<button class="lightbox__button lightbox__prev-button">
						<span>&lsaquo;</span>
					</button>
					<span class="pagination__text"></span>
				</div>
				<div class="lightbox__arrow lightbox__arrow--next pagination__next" data-direction="next">
					<span class="pagination__text"></span>
					<button class="lightbox__button lightbox__next-button">
						<span>&rsaquo;</span>
					</button>
				</div>
			</div>
		</div>
	</div>
`.trim()

export default template
