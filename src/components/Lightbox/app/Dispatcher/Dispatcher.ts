import { EventDispatcher } from '../../../../services'

import type {
	IDispatcher,
	LightboxEventMap,
	LightboxStateMap,
} from '@app'


export class LightboxDispatcher<E extends LightboxEventMap | LightboxStateMap>
extends EventDispatcher<E> implements IDispatcher<E> {}
