import { EventDispatcher } from '../../../../services'
import type { IDispatcher, LightboxEventMap } from './types'


export class LightboxDispatcher
	extends EventDispatcher<LightboxEventMap> implements IDispatcher {
}
