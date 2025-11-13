import type { Properties } from '../types'


export const findChildBy = <T extends HTMLElement = HTMLElement>(
	element: Element | undefined,
	criteria: Record<string, number | string> = {}
): T | undefined => {
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

	if (matches) return element as T

	for (let child of Array.from(element.children)) {
		const match = findChildBy<T>(child as T, criteria)
		if (match) return match
	}

	return
}


export const findParentBlock = (
	target:  Element | null | undefined,
	selector = '.fe-block'
): HTMLElement | undefined => {
	if (!target) return undefined
	else if (target.matches(selector)) return target as HTMLElement
	return target.closest(selector) as HTMLElement | undefined
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
