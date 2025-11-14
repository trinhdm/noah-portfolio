import { AnimationService as Animation, AnimationOptions } from '../../../../services'
import type { FilterValues } from '../../../../types'
import type { IDOM } from '../types/interfaces'
import type { IState } from '../../app'
import type { LightboxElement, LightboxElements } from '../../types'


export interface AnimatorContext {
	dom: IDOM
	queue: Set<Exclude<LightboxElement, HTMLElement[] | undefined>>
	state: IState
}


export abstract class BaseAnimator {
	constructor(protected ctx: AnimatorContext) {
		this.queue = ctx.queue
		this.state = ctx.state
		this.dom = ctx.dom
	}

	protected readonly settings = {
		arrows: {
			stagger: .25,
		},
		html: {
			delay: .3,
			stagger: .15,
		},
	}

	protected queue: AnimatorContext['queue']
	protected state: IState
	protected dom: IDOM

	static registry = new Map<string, typeof BaseAnimator>()

	static register(name: string, ctor: typeof BaseAnimator) {
		this.registry.set(name, ctor)
	}

	animate(
		key: keyof FilterValues<LightboxElements, Element[]> | Element | null | undefined,
		options: AnimationOptions = {},
		isPseudo: boolean = false
	): void {
		const target = typeof key === 'string'
			? this.dom.get(key)
			: key as HTMLElement | undefined

		if (!target) return
		this.queue.add(target)

		if (isPseudo) Animation.Pseudo.set(target, options)
		else Animation.set(target, options)
	}

	async waitForFinish(): Promise<void> {
		await new Promise(requestAnimationFrame)

		const queue = Array.from(this.queue),
			root = this.dom.get('root')

		if (!queue.length) return
		await Promise.all(queue.map(el => Animation.waitForEnd(el)))

		if (root.hasAttribute('data-animate'))
			root.removeAttribute('data-animate')

		this.queue.clear()
		this.state.reset('loaded')
		await new Promise(requestAnimationFrame)
	}
}
