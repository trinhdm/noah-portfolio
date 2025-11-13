import { EventDispatcher } from '../../../../services'
import type { IDispatcher } from './types/interfaces.d.ts'
import type { LightboxEventMap, LightboxStateMap } from './types/core.types.d.ts'


export class LightboxDispatcher<E extends LightboxEventMap | LightboxStateMap>
extends EventDispatcher<E> implements IDispatcher<E> {}
