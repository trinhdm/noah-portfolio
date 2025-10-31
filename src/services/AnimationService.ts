import type * as CSS from 'csstype'


export type BaseAnimationOptions = {
	delay?: number
	duration?: number
	index?: number
	stagger?: number
}

type AnimationOptions<T extends keyof CSS.Properties = keyof CSS.Properties> = BaseAnimationOptions & Partial<Record<T, CSS.Properties[T]>> & {
	timeout?: number
}

const PSEUDO_ELEMENTS = ['::before', '::after'] as const
type PseudoElement = typeof PSEUDO_ELEMENTS[number]


class Styles {
	private static readonly defaults: Required<BaseAnimationOptions> = {
		delay: 0,
		duration: .875,
		index: 0,
		stagger: 0,
	}

	static merge(options: AnimationOptions): Required<BaseAnimationOptions> {
		const merged = { ...this.defaults, ...options } as Required<BaseAnimationOptions>
		return merged
	}

	static compute(options: Required<BaseAnimationOptions>) {
		const {
			delay,
			duration,
			index,
			stagger,
			...styles
		} = options

		const baseTime = Math.max(duration - stagger, 0),
			startTime = delay >= 0 ? delay : baseTime

		return {
			animationDelay: `${((stagger * index) + startTime).toFixed(4)}s`,
			animationDuration: `${duration}s`,
			...styles
		}
	}

	static deriveFromDOM(styles: CSSStyleDeclaration) {
		const delay = parseFloat(styles.animationDelay) || 0,
			duration = parseFloat(styles.animationDuration) || 0,
			playState = styles.animationPlayState

		let base: Partial<BaseAnimationOptions & CSSStyleDeclaration> = {}

		if (delay > 0) base.delay = delay
		if (duration > 0) base.duration = duration
		if (playState === 'paused') base.animationPlayState = 'running'

		return base
	}
}

export class AnimationService {
	private static readonly waitTimes: Record<'default' | 'pause' | 'swap' | 'timeout', number> = {
		default: 50,
		pause: 500,
		swap: 1000,
		timeout: 1500,
	}

	static wait(value: keyof typeof AnimationService.waitTimes | number = 'default') {
		const delayMs: number = typeof value === 'string'
			? AnimationService.waitTimes[value]
			: value as number

		return new Promise<void>(resolve => setTimeout(resolve, delayMs))
	}

	static async waitForEnd(
		target: HTMLElement | undefined,
		timeoutMs = 50,
		event = 'animationend'
	): Promise<void> {
		const animations = target?.getAnimations()
		if (!target || !animations?.length) return

		await new Promise(requestAnimationFrame)

		const {
			delay = 0,
			duration = 0,
		} = Styles.deriveFromDOM(window.getComputedStyle(target))

		const totalMs = (duration + delay) * 1000,
			bufferTime = totalMs + timeoutMs

		if (totalMs === 0) return
		return Promise.race([
			new Promise<void>(resolve => {
				const handleEnd = (evt: Event) => {
					if ((evt as AnimationEvent).target !== target) return
					target.removeEventListener(event, handleEnd)
					resolve()
				}

				target.addEventListener(event, handleEnd, { once: true })
			}),
			AnimationService.wait(bufferTime),
		])
	}

	static set(
		element: Element | undefined,
		options: AnimationOptions | {} = {}
	) {
		if (!element) return
		const target = element as HTMLElement

		const { styles, timeout } = this.get([target], options)
		Object.assign(target.style, styles)

		return this.resetOnEnd(target, timeout)
	}

	private static get(
		targets: [HTMLElement] | [HTMLElement, string],
		options: AnimationOptions
	) {
		let styles = {}, timeout: AnimationOptions['timeout'] = undefined
		const [target] = targets,
			animations = target.getAnimations({ subtree: targets.length > 1 })

		if (animations?.length) {
			const domStyles = window.getComputedStyle(...targets as [Element, string | undefined]),
				merged = Styles.merge({ ...Styles.deriveFromDOM(domStyles), ...options }),
				computed = Styles.compute(merged)

			;({ timeout, ...styles } = computed as AnimationOptions)
		}

		return { styles, timeout }
	}

	private static resetOnEnd(
		target: HTMLElement,
		timeout: number = this.waitTimes.timeout
	) {
		let timeoutID: ReturnType<typeof setTimeout> | null = null

		const handleReset = (event: AnimationEvent) => {
			event.stopPropagation()
			timeoutID = setTimeout(() => {
				if (target.hasAttribute('style')) target.removeAttribute('style')
			}, timeout)
		}

		target.addEventListener('animationend', handleReset, { once: true, passive: true })
		if (timeoutID) clearTimeout(timeoutID)
		return () => target.removeEventListener('animationend', handleReset)
	}

	static Pseudo = class {
		private static detect(target: HTMLElement): PseudoElement[] {
			const pseudoEls = PSEUDO_ELEMENTS.filter(pseudo => {
				const pseudoStyles = window.getComputedStyle(target, pseudo)
				return !!pseudoStyles.length && pseudoStyles.content !== 'none'
			})

			return pseudoEls as PseudoElement[]
		}

		static set(
			element: Element | undefined,
			options: AnimationOptions
		) {
			if (!element) return
			const target = element as HTMLElement,
				pseudoEls = this.detect(target)

			if (!pseudoEls.length) return

			for (const pseudo of pseudoEls) {
				const pseudoName = pseudo.replaceAll(':', ''),
					{ styles, timeout } = AnimationService.get([target, pseudo], options)

				for (const [property, value] of Object.entries(styles))
					target.style.setProperty(`--${property}-${pseudoName}`, `${value}`)

				return AnimationService.resetOnEnd(target, timeout)
			}
		}
	}
}
