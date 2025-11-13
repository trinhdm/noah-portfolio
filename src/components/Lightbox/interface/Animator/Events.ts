import type { ArrowDirections } from '../../types/index.ts'
import type { IDispatcher } from '../../core/types/interfaces'
import type { IDOM, IEvents } from '../types/interfaces'


export class LightboxEvents implements IEvents {
	protected readonly dispatcher: IDispatcher
	protected readonly dom: IDOM
	private currentFocus: HTMLElement | undefined
	private handlers: Array<() => void> = []

	constructor(
		protected args: {
			dispatcher: IDispatcher,
			dom: IDOM,
			// options: LightboxOptions,
			// state: IState,
		}
	) {
		this.dispatcher = args.dispatcher
		this.dom = args.dom
	}

	private handleClick(
		target: HTMLElement,
		callback: (e: MouseEvent) => void
	): void {
		const handler = (e: MouseEvent) => { e.preventDefault(); callback?.(e) }
		target.addEventListener('click', handler)
		this.handlers.push(() => target.removeEventListener('click', handler))
	}

	private bindClicks(): void {
		const arrows = this.dom.get('arrows'),
			exit = this.dom.get('exit'),
			player = this.dom.get('player'),
			root = this.dom.get('root')

		if (root) {
			this.handleClick(root, (event: MouseEvent) => {
				event.stopPropagation()

				const { currentTarget, target } = event
				const isWrongTarget = target !== currentTarget,
					isDisabled = (target as HTMLElement)?.dataset.disabled === 'true'

				if (isWrongTarget || isDisabled) return
				console.log('click', target)
				this.dispatcher.emit('close')
			})
		}

		if (exit)
			this.handleClick(exit, () => this.dispatcher.emit('close'))

		// if (player) {
		// 	this.handleClick(player, () => {
		// 		console.log('click123')
		// 		this.dispatcher.emit('media')
		// 	})
		// }

		for (const arrow of arrows) {
			const direction = arrow.dataset.direction as ArrowDirections
			this.handleClick(arrow, () => this.dispatcher.emit('swap', direction))
		}
	}

	private bindKeys(): void {
		const icons = this.dom.get('icons')

		const keyHandlers = {
			ArrowDown: () => this.dispatcher.emit('swap', 'next'),
			ArrowLeft: () => this.dispatcher.emit('swap', 'prev'),
			ArrowRight: () => this.dispatcher.emit('swap', 'next'),
			ArrowUp: () => this.dispatcher.emit('swap', 'prev'),
			Escape: () => this.dispatcher.emit('close'),
		} as const

		const handleKey = (event: KeyboardEvent) => {
			event.stopPropagation()

			const { key, target } = event as {
				key: keyof typeof keyHandlers | 'Enter'
				target: HTMLElement | null
			}

			if (target?.hasAttribute('disabled'))
				event.preventDefault()

			if (key === 'Enter') {
				const isIconFocused = icons.some(ic => ic === document.activeElement)
				if (!isIconFocused) return

				this.currentFocus = document.activeElement as HTMLElement
				this.dom.onChange('data-disabled', (value, observer) => {
					if (value === 'false' && this.currentFocus) {
						this.currentFocus.focus()
						this.currentFocus = undefined
						observer.disconnect()
					}
				})

				return
			}

			return keyHandlers[key]?.()
		}

		window.addEventListener('keydown', handleKey)
		this.handlers.push(() => window.removeEventListener('keydown', handleKey))
	}

	private bindFocus(): void {
		const root = this.dom.get('root')

		const handleFocus = (event: FocusEvent) => {
			event.stopPropagation()
			if (root !== document.activeElement || !root.childElementCount) return
			(root.children[0] as HTMLElement).focus()
		}

		root.addEventListener('focusin', handleFocus)
		this.handlers.push(() => root.removeEventListener('focusin', handleFocus))
	}

	private bindTime(): void {
		const player = this.dom.get('player')
		let timeout: NodeJS.Timeout | null = null

		if (!player
			|| !player.hasAttribute('loop')
			|| !(player instanceof HTMLVideoElement)
		) return

		const handleTime = () => {
			if (timeout) clearTimeout(timeout)

			if (player.duration && player.currentTime >= player.duration - 1) {
				timeout = setTimeout(() => {
					player.currentTime = 0
					player.play()
				}, 1000)
			}
		}

		player.addEventListener('timeupdate', handleTime)
		this.handlers.push(() => player.removeEventListener('timeupdate', handleTime))
	}

	bind(): void {
		this.unbind()

		this.bindClicks()
		this.bindKeys()
		this.bindFocus()
		// this.bindTime()
	}

	unbind(): void {
		this.handlers.forEach(removeHandler => removeHandler())
		this.handlers = []
	}

	async watch(elements: (HTMLElement | null | undefined)[]): Promise<Event[]> {
		const events = {
			iframe: 'load',
			img: 'load',
			video: 'loadeddata',
		} as Partial<Record<keyof HTMLElementTagNameMap, keyof HTMLElementEventMap>>

		return await Promise.all(
			elements.map(async element => {
				const tag = element?.tagName.toLowerCase() as keyof HTMLElementTagNameMap

				if (!Object.hasOwn(events, tag)) {
					throw new Error(tag
						? `${tag} is missing event name`
						: `${element} is missing tag name`)
				}

				const event = events[tag] as keyof HTMLElementEventMap
				return await this.listen(element, event)
			})
		)
	}

	private async listen<K extends keyof HTMLElementEventMap>(
		element: HTMLElement | null | undefined,
		event: K
	): Promise<Event> {
		return new Promise<Event>((resolve, reject) => {
			if (!element) return reject(new Error(`${element} is undefined`))

			console.log({ element, event })
			element.addEventListener<K>(event, resolve, { once: true })
			element.addEventListener('error', reject, { once: true })
		})
	}
}
