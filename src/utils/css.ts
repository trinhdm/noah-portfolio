import type * as CSS from 'csstype'


type AnimationOptions<T extends keyof CSS.Properties = keyof CSS.Properties> = {
	duration?: number
	index: number
	stagger?: number
	start?: number
} & Partial<Record<T, CSS.Properties[T]>>


const getAnimation = ({
	duration = .875,
	index = 0,
	stagger = .15,
	start = 0,
	...args
}: AnimationOptions) => {
	const difference = duration - stagger,
		baseTime = difference >= 0 ? difference : 0

	const startTime = start >= 0
		? start
		: baseTime

	return {
		animationDelay: `${(stagger * index) + startTime}s`,
		animationDuration: `${duration}s`,
		...args
	}
}

const setAnimation = (
	element: HTMLElement,
	args: AnimationOptions
) => {
	const styles = window.getComputedStyle(element)
	const base: Partial<AnimationOptions> = {
		duration: Number(styles.getPropertyValue('animation-duration')) ?? .875,
	}

	const options = Object.assign({}, base, args)
	Object.assign(element.style, getAnimation(options))
}

const resetAttrs = ({
	block,
	className = '',
	listener,
	timeout = 1000
}: {
	block: HTMLElement | undefined,
	className?: string,
	listener?: HTMLElement | undefined,
	timeout?: number
}) => {
	if (!block) return
	const target = listener ?? block

	const onResetAttrs = async (event: AnimationEvent) => {
		event.stopPropagation()

		await new Promise(res => setTimeout(res, timeout))
		block.classList.remove(className)
		// block.removeAttribute('style')

		// setTimeout(() => {
		// 	block.classList.remove(className)
		// 	// block.removeAttribute('style')
		// }, timeout)
	}

	target.addEventListener('animationend', onResetAttrs, { once: true, passive: true })
}


export {
	resetAttrs,
	setAnimation,
}
