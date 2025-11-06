import type { ArrowDirections } from '../../../types/index.ts'
import type { IDispatcher } from '../../core/index.ts'
import type { IDOM, IEvents } from '../types/interfaces'


export class LightboxEvents implements IEvents {
	private currentFocus: HTMLElement | undefined
	private handlers: Array<() => void> = []

	constructor(
		private dom: IDOM,
		private dispatch: IDispatcher
	) {}

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
			root = this.dom.get('root')

		if (root) {
			this.handleClick(root, (event: MouseEvent) => {
				event.stopPropagation()
				if (event.target !== event.currentTarget) return
				this.dispatch.emit('close')
			})
		}

		if (exit) this.handleClick(exit, () => this.dispatch.emit('close'))

		for (const arrow of arrows) {
			const direction = arrow.dataset.direction as ArrowDirections
			this.handleClick(arrow, () => this.dispatch.emit('navigate', direction))
		}
	}

	private bindKeys(): void {
		const icons = this.dom.get('icons')

		const keyHandlers = {
			ArrowDown: () => this.dispatch.emit('navigate', 'next'),
			ArrowLeft: () => this.dispatch.emit('navigate', 'prev'),
			ArrowRight: () => this.dispatch.emit('navigate', 'next'),
			ArrowUp: () => this.dispatch.emit('navigate', 'prev'),
			Escape: () => this.dispatch.emit('close'),
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
}
