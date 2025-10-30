import type * as CSS from 'csstype'


export type BaseAnimationOptions = {
	delay?: number
	duration?: number
	index?: number
	stagger?: number
	timeout?: number
}

type AnimationOptions<T extends keyof CSS.Properties = keyof CSS.Properties> = BaseAnimationOptions & Partial<Record<T, CSS.Properties[T]>> & {
	className?: string
}

type AnimationChoices = keyof AnimationOptions

type PseudoElement = '::before' | '::after'


type TargetOptions = {
	parent: Element
	pseudo: PseudoElement
} | Element


class Styles {
	private static readonly baseOptions: Required<BaseAnimationOptions> = {
		delay: 0,
		duration: .875,
		index: 0,
		stagger: 0,
		timeout: 2500,
	}

	static computeStyles(options: AnimationOptions) {
		const {
			delay,
			duration,
			index,
			stagger,
			...styles
		} = { ...this.baseOptions, ...options }
		delete (styles as BaseAnimationOptions).timeout

		const baseTime = Math.max(duration - stagger, 0),
			startTime = delay >= 0 ? delay : baseTime

		return {
			animationDelay: `${((stagger * index) + startTime).toFixed(4)}s`,
			animationDuration: `${duration}s`,
			...styles
		}
	}

	static getStyles(
		target: TargetOptions,
		options: AnimationOptions
	) {
		let base = {}
		const element = (target instanceof Element
			? [target]
			: [target.parent, target.pseudo]) as [Element, string | undefined]

		const computed = window.getComputedStyle(...element)

		if (Object.hasOwn(computed, 'animationDelay')) {
			const baseDelay = parseFloat(computed.getPropertyValue('animation-delay'))

			if (baseDelay > 0)
				Object.assign(base, { delay: baseDelay })
		}

		if (Object.hasOwn(computed, 'animationDuration')) {
			const baseDuration = parseFloat(computed.getPropertyValue('animation-duration'))

			if (baseDuration > 0)
				Object.assign(base, { duration: baseDuration })
		}

		if (Object.hasOwn(computed, 'animationPlayState')) {
			const basePlayState = computed.getPropertyValue('animation-play-state')

			if (basePlayState === 'paused')
				Object.assign(base, { animationPlayState: 'running' })
		}

		return Object.assign({}, base, options)
	}

	static applyStyles(
		target: HTMLElement,
		options: AnimationOptions
	) {
		const merged = this.getStyles(target, options),
			args = this.computeStyles(merged) as AnimationOptions

		Object.assign(target.style, args)

		return args
	}

	static resetStyles = (
		target: HTMLElement,
		options: AnimationOptions
	) => {
		const {
			className = '',
			timeout = this.baseOptions.timeout,
		} = options
		let timeoutID: ReturnType<typeof setTimeout> | null = null

		const handleReset = (event: AnimationEvent) => {
			event.stopPropagation()

			timeoutID = setTimeout(() => {
				if (className) target.classList.remove(className)
				if (target.hasAttribute('style')) target.removeAttribute('style')
			}, timeout)
		}

		target.addEventListener('animationend', handleReset, { once: true, passive: true })
		return () => {
			target.removeEventListener('animationend', handleReset)
			if (timeoutID) clearTimeout(timeoutID)
		}
	}
}

export class AnimationService {
	private static readonly waitTimes: Record<'default' | 'pause' | 'swap', number> = {
		default: 50,
		pause: 500,
		swap: 1000,
	}

	static wait = (value: keyof typeof AnimationService.waitTimes | number = 'default') => {
		const delayMs: number = typeof value === 'string'
			? AnimationService.waitTimes[value]
			: value as number

		return new Promise<void>(resolve => setTimeout(resolve, delayMs))
	}

	static set = (
		target: HTMLElement | undefined,
		options: AnimationOptions | {} = {}
	) => {
		if (!target) return
		const args = this.configure(options),
			computed = this.get(target, args)

		Object.assign(target.style, computed)

		return Styles.resetStyles(target, options)
	}

	static get(
		target: TargetOptions,
		options: AnimationOptions
	) {
		const merged = Styles.getStyles(target, options),
			computed = Styles.computeStyles(merged) as AnimationOptions

		return computed
	}

	private static configure = (options: AnimationOptions | {} = {}) => {
		let args = {} as AnimationOptions

		if (!!Object.keys(options).length) {
			const omitted = ['className', 'timeout'] as AnimationChoices[],
				opts = Object.keys(options) as AnimationChoices[]

			args = opts.reduce((obj: AnimationOptions, key: AnimationChoices) => {
				if (!omitted.includes(key))
					(obj as any)[key] = (options as AnimationOptions)[key]
				return obj
			}, {}) as Omit<AnimationOptions, AnimationChoices>
		}

		return args
	}

	static Pseudo = class {
		private static applyStyles(
			target: HTMLElement,
			pseudo: PseudoElement,
			options: AnimationOptions
		) {
			const targetGroup = { parent: target, pseudo },
				computed = AnimationService.get(targetGroup, options)

			Object.entries(computed).forEach(([property, value]) => {
				target.style.setProperty(`--${property}`, `${value}`)
			})
		}

		private static validate = (target: HTMLElement | undefined): PseudoElement[] => {
			if (!target) return []

			const pseudoEls = ['::before', '::after'].filter(pseudo => {
				const pseudoStyle = window.getComputedStyle(target, pseudo)
				return !!pseudoStyle.length && pseudoStyle.content !== 'none'
			})

			return pseudoEls as PseudoElement[]
		}

		static set = (
			target: HTMLElement | undefined,
			options: AnimationOptions
		) => {
			const pseudoEls = this.validate(target)
			if (!target || !pseudoEls.length) return

			if (Object.hasOwn(options, 'className'))
				target.classList.add(`${options.className}`)

			const args = AnimationService.configure(options)
			this.applyStyles(target, pseudoEls[0], args)

			return Styles.resetStyles(target, options)
		}
	}
}
