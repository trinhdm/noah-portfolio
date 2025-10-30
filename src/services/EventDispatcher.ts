
type HandlerFor<E, K extends keyof E> =
	E[K] extends void
		? () => void | Promise<void>
		: (payload: E[K]) => void | Promise<void>

type EventHandler<E extends Record<string, any>> = {
	[K in keyof E]: HandlerFor<E, K>
}[keyof E]


export class EventDispatcher<E extends Record<string, any>> {
	private listeners = new Map<keyof E, Set<(payload: E[keyof E]) => void>>()

	on<K extends keyof E>(event: K, handler: HandlerFor<E, K>) {
		const set = this.listeners.get(event) ?? new Set<EventHandler<E>>()
		set.add(handler as EventHandler<E>)
		this.listeners.set(event, set)
	}

	off<K extends keyof E>(event: K, handler: HandlerFor<E, K>) {
		this.listeners.get(event)?.delete(handler as EventHandler<E>)
	}

	async emit<K extends keyof E>(event: K, payload?: E[K]): Promise<void> {
		const set = this.listeners.get(event)
		if (!set || set.size === 0) return

		const handlers = Array.from(set)

		for (const handler of handlers) {
			try {
				const res = (handler as any)(payload)
				if (res instanceof Promise) await res
			} catch (err) {
				console.error(`error in handler for event ${String(event)}`, err)
			}
		}
	}

	clear<K extends keyof E>(event?: K) {
		if (event) this.listeners.delete(event)
		else this.listeners.clear()
	}
}
