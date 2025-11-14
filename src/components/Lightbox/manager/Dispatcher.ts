import { EventDispatcher } from '../../../services/index.ts'
import type { IDispatcher } from './types/interfaces.d.ts'
import type { LightboxEventMap } from '../core'
import type { LightboxStateMap } from './types'


export class LightboxDispatcher<E extends LightboxEventMap | LightboxStateMap>
extends EventDispatcher<E> implements IDispatcher<E> {}
