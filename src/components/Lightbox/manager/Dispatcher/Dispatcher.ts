import { EventDispatcher } from '../../../../services/index.ts'
import type { IDispatcher } from '../types/interfaces'
import type { LightboxEventMap } from '../../core/index.ts'
import type { LightboxStateMap } from '../types/index.ts'


export class LightboxDispatcher<E extends LightboxEventMap | LightboxStateMap>
extends EventDispatcher<E> implements IDispatcher<E> {}
