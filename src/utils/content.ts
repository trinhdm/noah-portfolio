
const findElement = (
	target:  HTMLElement | null,
	selector = '.fe-block'
): HTMLElement | null => {
	if (!target) return null
	else if (target.matches(selector)) return target

	return target.closest(selector) as HTMLElement | null
}


export { findElement }
