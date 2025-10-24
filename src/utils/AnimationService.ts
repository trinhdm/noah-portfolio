import type * as CSS from 'csstype'


type BaseAnimationOptions = {
	duration?: number
	index: number
	stagger?: number
	start?: number
	timeout?: number
}

type AnimationOptions<T extends keyof CSS.Properties = keyof CSS.Properties> = BaseAnimationOptions & Partial<Record<T, CSS.Properties[T]>> & {
	className?: string
}


export class AnimationService {
	private static readonly baseOptions: Required<BaseAnimationOptions> = {
		duration: .875,
		index: 0,
		stagger: .15,
		start: 0,
		timeout: 1000,
	}

	private static computeStyles(options: AnimationOptions) {
		const {
			duration,
			index,
			stagger,
			start,
			...styles
		} = { ...this.baseOptions, ...options }

		const baseTime = Math.max(duration - stagger, 0),
			startTime = start >= 0 ? start : baseTime

		delete (styles as BaseAnimationOptions).timeout

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
		const computed = window.getComputedStyle(target),
			baseDuration = parseFloat(computed.getPropertyValue('animation-duration'))

		const merged = baseDuration
			? { duration: baseDuration, ...options }
			: options

		Object.assign(target.style, this.computeStyles(merged) as AnimationOptions)
	}

	static resetStyles = (
		target: HTMLElement,
		options: Pick<AnimationOptions, 'className' | 'timeout'>
	) => {
		const {
			className,
			timeout = this.baseOptions.timeout,
		} = options
		let timeoutID: ReturnType<typeof setTimeout> | null = null

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

	static stagger = (
		target: HTMLElement | undefined,
		options: AnimationOptions
	) => {
		if (!target) return

		const { className, timeout, ...args } = options
		this.applyStyles(target, args)

		return AnimationService.resetStyles(target, { className, timeout })
	}
}
