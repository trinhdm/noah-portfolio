
export const findChildBy = (
	element: HTMLElement | null,
	criteria: Record<string, number | string> = {}
): HTMLElement | null => {
	if (!element) return null

	const [property, value] = Object.entries(criteria)[0]
	if (!property) return null

	const actual = (element as any)[property],
		expected = property === 'tagName' && typeof value === 'string'
			? value.toUpperCase()
			: value

	const matches = actual === expected
		|| (actual && typeof actual === 'object' && Object.keys(actual).includes(String(expected)))

	// const target = element[`${property as keyof typeof element}`]
	// let condition = target === value

	// if (!!target && typeof target === 'object') {
	// 	const values = Object.keys(Object.fromEntries(Object.entries(target)))
	// 	condition = !!values?.length && values?.includes(`${value}`)
	// }

	if (matches) return element

	for (let child of Array.from(element.children)) {
		const match = findChildBy(child as HTMLElement, criteria)
		if (match) return match
	}

	return null
}


export const findElement = (
	target:  HTMLElement | null,
	selector = '.fe-block'
): HTMLElement | null => {
	if (!target) return null
	else if (target.matches(selector)) return target

	return target.closest(selector) as HTMLElement | null
}


export const getDeepestChild = (parent: Element): Element[] => (
	Array.from(parent.children)
		.reduce<Element[]>((acc, child) => {
			if (child.children.length === 0) acc.push(child)
			else acc.push(...getDeepestChild(child))

			return acc
		}, [])
)

export const toggleDisableAttr = <T extends HTMLElement = HTMLElement>(target: T) => {
	let isDisabled = true

	const setProperties = (
		properties: Record<keyof T, T[keyof T]> | {}
	) => Object.entries(properties)
		.forEach(([prop, value]) => target.setAttribute(prop, `${value}`))

	if (target.hasAttribute('data-disabled')) {
		isDisabled = target.dataset.disabled === 'true'
		isDisabled = !isDisabled
	}

	setProperties({ 'data-disabled': `${isDisabled}` })
}
