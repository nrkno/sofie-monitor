import { Request, Response } from 'express'
import { sendUserActionApiPostRequest } from '../../agents/sofie-core/sofieCoreAgent'
import logger from '../../util/logger'

export interface SofieSubDeviceState {
	enabled: boolean
}
export interface SubDeviceStatePayload {
	host: string
	peripheralDeviceId: string
	subDeviceId: string
	desiredSubDeviceState: SofieSubDeviceState
}

export function isSofieSubDeviceState(obj: SofieSubDeviceState): obj is SofieSubDeviceState {
	return obj && typeof obj.enabled === 'boolean'
}

export function isSubDeviceStatePayload(obj: SubDeviceStatePayload): obj is SubDeviceStatePayload {
	if (!obj) {
		return false
	}

	const { host, peripheralDeviceId, subDeviceId, desiredSubDeviceState } = obj

	if (![host, peripheralDeviceId, subDeviceId].every((t) => typeof t === 'string')) {
		return false
	}

	return isSofieSubDeviceState(desiredSubDeviceState)
}

export async function setPeripheralSubDeviceStateHandler(req: Request, res: Response): Promise<void> {
	const payload = req.body

	if (!isSubDeviceStatePayload(payload)) {
		logger.debug(`setPeripheralSubDeviceStateHandler: Invalid payload`, { payload })
		res.status(400).send('Invalid payload in request')
		return
	}

	try {
		const { host, peripheralDeviceId, subDeviceId, desiredSubDeviceState } = payload

		await setPeripheralSubDeviceState(host, peripheralDeviceId, subDeviceId, desiredSubDeviceState)
		res.status(200).json(payload)
		return
	} catch (err: any) {
		logger.error(`Unable to set peripheral subdevice state`, { payload, error: err })
		res.status(500).send(err.message)
		return
	}
}

/*
 * Send POST request to sofie/api/0/action/disablePeripheralSubDevice/restApi/[peripheralDeviceId -
 * like playoutCoreParent]/[subDeviceId - like caspar02]/true to disable device and /false to re-enable
 */

async function setPeripheralSubDeviceState(
	href: string,
	peripheralDeviceId: string,
	subDeviceId: string,
	desiredState: SofieSubDeviceState
) {
	const actionPath = `/disablePeripheralSubDevice/restApi/${peripheralDeviceId}/${subDeviceId}/${desiredState.enabled}`

	return sendUserActionApiPostRequest(href, actionPath) //TODO:find better return values
}
