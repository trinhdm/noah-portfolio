
export const findChildBy = (
	element: HTMLElement | undefined,
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


export const getBackground = (selector: string = '.section-background') => {
	const target = document.querySelector(selector)
	if (!target || !target.children.length || !target.querySelector('img')) return null

	const background = document.createElement('div')
	background.classList.add('background')
	background.append(target.cloneNode(true))

	const image = findChildBy(background, { tagName: 'img' }),
		overlay = background.querySelector('.section-background-overlay')

	if (!!image && !!overlay)
		(image as HTMLImageElement).style.opacity = (overlay as HTMLDivElement).style.opacity

	document.querySelector('.content-wrapper')?.prepend(background)
}


export const getDeepestChild = (parent: Element): Element[] => (
	Array.from(parent.children)
		.reduce<Element[]>((acc, child) => {
			if (child.children.length === 0) acc.push(child)
			else acc.push(...getDeepestChild(child))

			return acc
		}, [])
)


export const wrapContent = (
	input: HTMLElement | string | null | undefined,
	tag: string = 'span',
	sanitize = true
): HTMLElement | null => {
	if (!input) return null

	let content = typeof input === 'string' ? input : input.innerHTML
	const wrapper = document.createElement(tag)

	if (sanitize)
		content = content.replaceAll('<br>', '').trim()

	wrapper.innerHTML = content

	return wrapper
}
