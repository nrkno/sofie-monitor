import { Application } from 'express'
import { registerCoreControlApiHandlers } from './coreControl/api'
import { registerServiceMessageApiHandlers } from './serviceMessages/api'
import { registerSofieInstancesApiHandlers } from './sofieInstances/api'

export { EndpointDescription, registerApiHandlers }

const API_ROOT = '/api'

function registerApiHandlers(app: Application): void {
	registerServiceMessageApiHandlers(app, API_ROOT)
	registerSofieInstancesApiHandlers(app, API_ROOT)
	registerCoreControlApiHandlers(app, API_ROOT)
}

interface EndpointDescription {
	path: string
	method: string
	useId?: boolean
}
