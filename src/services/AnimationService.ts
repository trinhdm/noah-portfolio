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
		target: HTMLElement | {
			parent: HTMLElement
			pseudo: string
		},
		options: AnimationOptions
	) {
		let base = {}
		const computed = target instanceof HTMLElement
			? window.getComputedStyle(target)
			: window.getComputedStyle(target.parent, target.pseudo)

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

		const merged = Object.assign({}, base, options)

		return merged
	}

	static applyStyles(
		target: HTMLElement,
		options: AnimationOptions
	) {
		const merged = this.getStyles(target, options),
			args = this.computeStyles(merged) as AnimationOptions

		Object.assign(target.style, args)
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
				if (className)
					target.classList.remove(className)
				if (target.hasAttribute('style'))
					target.removeAttribute('style')
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

	private static configure = (options: AnimationOptions | {} = {}) => {
		let args = {} as AnimationOptions

		if (!!Object.keys(options).length) {
			const omitted = ['className', 'timeout'] as (keyof AnimationOptions)[],
				opts = Object.keys(options) as (keyof AnimationOptions)[]

			args = opts.reduce((obj: AnimationOptions, key: keyof AnimationOptions) => {
				if (!omitted.includes(key))
					(obj as any)[key] = (options as AnimationOptions)[key]

				return obj
			}, {}) as Omit<AnimationOptions, keyof AnimationOptions>
		}

		return args
	}

	static set = (
		target: HTMLElement | undefined,
		options: AnimationOptions | {} = {}
	) => {
		if (!target) return
		const args = this.configure(options)
		Styles.applyStyles(target, args)

		return Styles.resetStyles(target, options)
	}

	static Pseudo = class {
		private static applyStyles(
			target: HTMLElement,
			pseudo: string,
			options: AnimationOptions
		) {
			const pseudoTarget = { parent: target, pseudo }
			const merged = Styles.getStyles(pseudoTarget, options),
				args = Styles.computeStyles(merged) as AnimationOptions

			Object.entries(args).forEach(([property, value]) => {
				target.style.setProperty(`--${property}`, `${value}`)
			})
		}

		static validate = (target: HTMLElement | undefined) => {
			if (!target) return []

			const pseudoEls = ['::before', '::after'].filter(pseudo => {
				const pseudoStyle = window.getComputedStyle(target, pseudo)
				return !!pseudoStyle.length && pseudoStyle.content !== 'none'
			})

			return pseudoEls
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
