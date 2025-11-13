import { AnimatorFactory } from '../AnimatorFactory.ts'
import { AnimationService as Animation } from '../../../../../services/index.ts'
import type { LightboxElements } from '../../../types/index.ts'
import { BaseAnimator, type AnimatorContext } from '../BaseAnimator.ts'


class MediaAnimator extends BaseAnimator {
	constructor(ctx: AnimatorContext) {
		super(ctx)
	}

	static { BaseAnimator.register('media', this) }

	async fadeBlocks(isParallel: boolean = false): Promise<void> {
		console.log('fade media')
		const image = this.dom.get('image'),
			video = this.dom.get('video')

		if (!image || !video) return
		const media = { image, video }

		if (isParallel) await this.fadeParallel(media)
		else await this.fadeSequential(media)
	}

	private async fadeParallel({ image, video }: Pick<LightboxElements, 'image' | 'video'>): Promise<void> {
		this.animate(video)
		this.animate(image)

		const imageDelay = parseFloat(image!.style.animationDelay),
			videoDelay = parseFloat(video!.style.animationDelay),
			slower = imageDelay >= videoDelay ? image : video

		await Animation.waitForEnd(slower)
	}

	private async fadeSequential({ image, video }: Pick<LightboxElements, 'image' | 'video'>): Promise<void> {
		this.animate(video)
		await Animation.waitForEnd(video)

		this.animate(image)
		await Animation.waitForEnd(image)
	}
}


AnimatorFactory.register({
	key: 'media',
	Module: MediaAnimator,
	selectors: ['image', 'video'],
	type: 'group',
})


export default MediaAnimator
