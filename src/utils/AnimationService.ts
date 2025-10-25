import type * as CSS from 'csstype'


type BaseAnimationOptions = {
	delay?: number
	duration?: number
	hasReset?: boolean
	index?: number
	stagger?: number
	timeout?: number
}

type AnimationOptions<T extends keyof CSS.Properties = keyof CSS.Properties> = BaseAnimationOptions & Partial<Record<T, CSS.Properties[T]>> & {
	className?: string
}


export class AnimationService {
	private static readonly baseOptions: Required<BaseAnimationOptions> = {
		delay: 0,
		duration: .875,
		hasReset: true,
		index: 0,
		stagger: 0,
		timeout: 2500,
	}

	private static computeStyles(options: AnimationOptions) {
		const {
			delay,
			duration,
			index,
			stagger,
			...styles
		} = { ...this.baseOptions, ...options }

		const baseTime = Math.max(duration - stagger, 0),
			startTime = delay >= 0 ? delay : baseTime

		return {
			animationDelay: `${((stagger * index) + startTime).toFixed(4)}s`,
			animationDuration: `${duration}s`,
			...styles
		}
	}

	private static applyStyles(
		target: HTMLElement,
		options: AnimationOptions
	) {
		const computed = window.getComputedStyle(target)
		let base = {}

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

		const merged = Object.assign({}, base, options),
			args = this.computeStyles(merged) as AnimationOptions

		Object.assign(target.style, args)
	}

	static resetStyles = (
		target: HTMLElement,
		options: AnimationOptions
	) => {
		const {
			className = '',
			hasReset = this.baseOptions.hasReset,
			timeout = this.baseOptions.timeout,
		} = options
		let timeoutID: ReturnType<typeof setTimeout> | null = null

		if (!hasReset) return

		const handleReset = (event: AnimationEvent) => {
			event.stopPropagation()

			timeoutID = setTimeout(() => {
				if (className)
					target.classList.remove(className)
				target.removeAttribute('style')
			}, timeout)
		}

		target.addEventListener('animationend', handleReset, { once: true, passive: true })
		return () => {
			target.removeEventListener('animationend', handleReset)
			if (timeoutID) clearTimeout(timeoutID)
		}
	}

	static set = (
		target: HTMLElement | undefined,
		options: AnimationOptions | {} = {}
	) => {
		if (!target) return
		let args = {} as AnimationOptions

		if (!!Object.keys(options).length) {
			const omitted = ['className', 'hasReset', 'timeout'] as (keyof AnimationOptions)[],
				opts = Object.keys(options) as (keyof AnimationOptions)[]

			args = opts.reduce((obj: AnimationOptions, key: keyof AnimationOptions) => {
				if (!omitted.includes(key))
					(obj as any)[key] = (options as AnimationOptions)[key]

				return obj
			}, {}) as Omit<AnimationOptions, keyof AnimationOptions>
		}

		this.applyStyles(target, args)

		return AnimationService.resetStyles(target, options)
	}
}
