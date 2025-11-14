import { EventDispatcher } from '../../../../services/index.ts'
import type { IDispatcher } from '../types/interfaces'
import type { LightboxEventMap, LightboxStateMap } from '../types'


export class LightboxDispatcher<E extends LightboxEventMap | LightboxStateMap>
extends EventDispatcher<E> implements IDispatcher<E> {}
