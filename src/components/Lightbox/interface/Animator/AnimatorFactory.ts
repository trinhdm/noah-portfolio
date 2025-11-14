import { BaseAnimator, type AnimatorContext } from './BaseAnimator.ts'
import { LightboxElements } from '@lightbox/types'


// type AnimatorModule = new (ctx: AnimatorContext) => BaseAnimator & {
// 	// isValid?(dom: IDOM): boolean
// 	// key: string
// }

type AnimatorType = 'group' | 'element'

interface AnimatorMeta {
	key: string
	Module: new (ctx: AnimatorContext, el?: Element) => BaseAnimator
	selectors?: (keyof LightboxElements)[]
	type: AnimatorType
}


export class AnimatorFactory {
	private static modules = new Set<AnimatorMeta>()

	static register(meta: AnimatorMeta): void {
		this.modules.add(meta)
	}

	static create(ctx: AnimatorContext): Map<string, BaseAnimator> {
		const instances = new Map<string, BaseAnimator>()

		for (const { key, Module, selectors, type } of this.modules) {
			instances.set(key, new Module(ctx))

			// if (type === 'group') {
			// 	instances.set(key, [new Module(ctx)])
			// } else if (type === 'element') {
			// 	if (!selectors?.length) continue
			// 	const group = selectors.map(select =>
			// 			ctx.dom.get(select) && new Module(ctx))
			// 		.filter(Boolean) as BaseAnimator[]
			// 	instances.set(key, group)
			// }

			// // instances.set(new Module(ctx))
		}

		return instances
	}
}
