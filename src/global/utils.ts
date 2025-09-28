
export const findChildBy = (
	element: HTMLElement | undefined,
	criteria: Record<string, number | string> = {}
) => {
	let [property, value] = Object.entries(criteria)[0]

	if (!element || property in element === false)
		return

	value = property === 'tagName' && typeof value === 'string'
		? value.toUpperCase()
		: value

	const target = element[`${property as keyof typeof element}`]
	let condition = target === value

	if (!!target && typeof target === 'object') {
		const values = Object.keys(Object.fromEntries(Object.entries(target)))
		condition = !!values?.length && values?.includes(`${value}`)
	}

	if (condition)
		return element

	for (let child of element.children) {
		const match = findChildBy(child as HTMLElement | undefined, criteria) as HTMLElement | undefined
		if (match) return match
	}
}


export const getBackground = (selector: string = '.section-background') => {
	const background = document.createElement('div'),
		 target = document.querySelector(selector)

	if (!target?.children.length || !target.querySelector('img')) return

	background.append(target)
	background.classList.add('background')

	const image = findChildBy(background, { tagName: 'img' }),
		overlay = background.querySelector('.section-background-overlay')

	if (!!image && !!overlay)
		(image as HTMLImageElement).style.opacity = (overlay as HTMLDivElement).style.opacity

	const container = document.querySelector('.content-wrapper')
	container?.prepend(background)
}


export const getDeepestChild = (parent: Element): Element[] => Array
	.from(parent.children)
	.reduce<Element[]>((acc, node) => {
		const children = Array.from(node.children)

		if (!children.length) {
			acc.push(node);
			return acc
		}

		return [...acc, ...getDeepestChild(node)]
	}, [])


// tidyContent
export const tidyContent = (
	content: HTMLElement | string | undefined,
	wrapTag: string = 'span'
) => {
	if (!content) return

	const wrapEl = document.createElement(wrapTag)

	switch (typeof content) {
		case 'object':
			const element = content.innerHTML.replaceAll('<br>', '').trim()
			wrapEl.innerHTML = element
			break
		case 'string':
			wrapEl.textContent = content
			break
	}

	return wrapEl
}


export const wrapTrimEl = (
	element: HTMLElement | undefined,
	wrapTag: string = 'span'
) => {
	if (!element) return

	const content = element.innerHTML.replaceAll('<br>', '').trim(),
		wrapEl = document.createElement(wrapTag)

	wrapEl.innerHTML = content

	return wrapEl
}


// class Dimensions {
// 	constructor(index, init, span) {
// 		this.index = index
// 		this.init = init
// 		this.span = span
// 	}

// 	get start() {
// 		return this.init + (this.span * this.index)
// 	}

// 	get end() {
// 		return this.start + this.span
// 	}
// }

// class Grid {
// 	constructor(
// 		index = 1,
// 		colInit = 5,
// 		colSpan = 6,
// 		rowInit = 4,
// 		rowSpan = 4
// 	) {
// 		this._index = index
// 		this.Column = new Dimensions(index, colInit, colSpan)
// 		this.Row = new Dimensions(index, rowInit, rowSpan)
// 	}

// 	get Area() {
// 		const col = this.Column,
// 			row = this.Row,
// 			areaStart = `${row.start} / ${col.start}`

// 		return {
// 			get layout() {
// 				return `${areaStart} / span ${row.span} / span ${col.span}`;
// 			},
// 			get size() {
// 				return `${areaStart} / ${row.end} / ${col.end}`;
// 			}
// 		}
// 	}
// }
