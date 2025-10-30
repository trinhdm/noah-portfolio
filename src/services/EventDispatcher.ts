
type EventHandler = (payload?: any) => void | Promise<void>

export class EventDispatcher<E extends string> {
	private events = new Map<E, Set<EventHandler>>()

	on(event: E, handler: EventHandler) {
		if (!this.events.has(event)) this.events.set(event, new Set())
		this.events.get(event)!.add(handler)
	}

	off(event: E, handler: EventHandler) {
		this.events.get(event)?.delete(handler)
	}

	async emit(event: E, payload?: any) {
		const handlers = this.events.get(event)
		if (!handlers) return

		for (const handler of handlers)
			await handler(payload)
	}

	clear(event?: E) {
		if (event) this.events.delete(event)
		else this.events.clear()
	}
}




// type HandlerFor<E, K extends keyof E> =
// 	E[K] extends void
// 		? () => void | Promise<void>
// 		: (payload: E[K]) => void | Promise<void>

// type EventHandler<E extends Record<string, any>> = {
// 	[K in keyof E]: HandlerFor<E, K>
// }[keyof E]


// export class EventDispatcher<E extends Record<string, any>> {
// 	private listeners = new Map<keyof E, Set<(payload: E[keyof E]) => void>>()

// 	on<K extends keyof E>(event: K, handler: HandlerFor<E, K>) {
// 		if (!this.listeners.has(event)) this.listeners.set(event, new Set())
// 		this.listeners.get(event)!.add(handler as EventHandler<E>)
// 	}

// 	off<K extends keyof E>(event: K, handler: HandlerFor<E, K>) {
// 		this.listeners.get(event)?.delete(handler as EventHandler<E>)
// 	}

// 	async emit<K extends keyof E>(event: K, payload?: E[K]): Promise<void> {
// 		const handlers = this.listeners.get(event)
// 		if (!handlers) return

// 		for (const handler of handlers)
// 			await handler(payload)
// 	}

// 	clear<K extends keyof E>(event?: K) {
// 		if (event) this.listeners.delete(event)
// 		else this.listeners.clear()
// 	}
// }
