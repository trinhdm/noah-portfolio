import { BaseAnimator } from './BaseAnimator'



export const RegisterAnimator = <T extends typeof BaseAnimator> (target: T) => {
	BaseAnimator.register(target.name.replace('Animator', ''), target)
}
