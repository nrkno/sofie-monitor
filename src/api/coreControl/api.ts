import { Application } from 'express'
import logger from '../../util/logger'
import { EndpointDescription } from '../api'
import { setPeripheralSubDeviceStateHandler } from './peripheralDevices'

const PATHNAME = 'coreControl'
const endpoints: { [index: string]: EndpointDescription } = {}

export function registerCoreControlApiHandlers(app: Application, apiRoot: string): void {
	const path = `${apiRoot}/${PATHNAME}/peripheralDevice/subDevice/setState`
	app.post(`${path}`, (req, res) => void setPeripheralSubDeviceStateHandler(req, res))

	endpoints.setPeripheralSubDeviceState = {
		path,
		method: 'POST',
		useId: false,
	}

	logger.debug(`Registered core control handlers`, { endpoints })
}

export function getEndpoints(): { [index: string]: EndpointDescription } {
	return { ...endpoints }
}
