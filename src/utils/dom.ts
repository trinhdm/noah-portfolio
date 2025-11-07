import type { Properties } from '../types'


export const findChildBy = (
	element: Element | undefined,
	criteria: Record<string, number | string> = {}
): HTMLElement | undefined => {
	if (!element) return

	const [property, value] = Object.entries(criteria)[0]
	if (!property) return

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

	if (matches) return element as HTMLElement

	for (let child of Array.from(element.children)) {
		const match = findChildBy(child as HTMLElement, criteria)
		if (match) return match
	}

	return
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
			if (child.childElementCount) acc.push(...getDeepestChild(child))
			else acc.push(child)

			return acc
		}, [])
)

const setProperties = <T extends HTMLElement>(
	target: T,
	properties: Properties<T>
) => Object.entries(properties)
	.forEach(([prop, value]) => target.setAttribute(prop, `${value}`))


export const toggleDisableAttr = <T extends HTMLElement = HTMLElement>(target: T) => {
	const dataAttr = 'data-disabled'
	let isDisabled = true

	if (target.hasAttribute(dataAttr)) {
		isDisabled = target.dataset.disabled === 'true'
		isDisabled = !isDisabled
	}

	const disabledProps = {
		// 'aria-hidden': `${isDisabled}`,
		[dataAttr]: `${isDisabled}`,
	}

	setProperties<T>(target, disabledProps)
}
