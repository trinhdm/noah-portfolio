import { EventDispatcher } from '../../../../services'
import type { IDispatcher } from './types/interfaces.d.ts'
import type { LightboxEventMap } from './types/core.types.d.ts'


export class LightboxDispatcher
extends EventDispatcher<LightboxEventMap> implements IDispatcher {
}
