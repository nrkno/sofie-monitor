import { Application, Request, Response } from 'express'
import { getEndpoints } from '../api/coreControl/api'
import { SubDeviceStatePayload } from '../api/coreControl/peripheralDevices'
import { getAllInstances } from '../data/sofieInstances/api'
import { formatDateTime } from '../lib/dateFormat'
import { getQuerystringParamValues, getServerData } from '../lib/lib'
import logger from '../util/logger'
import fs from 'fs'
import { callAsyncAsCallback } from '../util/callAsyncAsCallback'

export function registerCoreControlHandler(app: Application): void {
	app.get('/coreControl', (req, res) => callAsyncAsCallback(getHandler, undefined, req, res))

	logger.debug('registered core control panel route')
}

let rk5rk6SubDevicesToEnableDisable: any = null
if (process.env.CONTROL_SUB_DEVICES_CONFIG_PATH) {
	try {
		// Load the info about sub-devices to control from a file
		const rawFile = fs.readFileSync(process.env.CONTROL_SUB_DEVICES_CONFIG_PATH)
		rk5rk6SubDevicesToEnableDisable = JSON.parse(rawFile.toString())

		rk5rk6SubDevicesToEnableDisable.rk5.disablePayloads = createPeripheralSubDevicePayloads(
			rk5rk6SubDevicesToEnableDisable.rk5,
			false
		)
		rk5rk6SubDevicesToEnableDisable.rk5.enablePayloads = createPeripheralSubDevicePayloads(
			rk5rk6SubDevicesToEnableDisable.rk5,
			true
		)
		rk5rk6SubDevicesToEnableDisable.rk6.disablePayloads = createPeripheralSubDevicePayloads(
			rk5rk6SubDevicesToEnableDisable.rk6,
			false
		)
		rk5rk6SubDevicesToEnableDisable.rk6.enablePayloads = createPeripheralSubDevicePayloads(
			rk5rk6SubDevicesToEnableDisable.rk6,
			true
		)
	} catch (e) {
		logger.error(`Failed to load list of sub-devices to control: ${e}`)
		rk5rk6SubDevicesToEnableDisable = null
	}
}

async function getHandler(req: Request, res: Response): Promise<void> {
	const hosts = []
	for (const value of getQuerystringParamValues(req, 'servers')) {
		hosts.push(...value.split(','))
	}

	const servers = await getServerData(hosts)
	const instances = await getAllInstances()
	const endpoints = getEndpoints()

	res.render('coreControl', {
		title: 'Core Control',
		servers: servers.map((server: any) => {
			return { ...server, host: server._host }
		}),
		formatDateTime,
		endpoints,
		instances,
		req,
		rk5rk6SubDevicesToEnableDisable,
	})
}

function createPeripheralSubDevicePayloads(instance: any, enabled: boolean): SubDeviceStatePayload[] {
	const { host, playout } = instance
	return playout.subDevices.map((subDeviceId: string) => {
		return {
			host,
			peripheralDeviceId: playout.name,
			subDeviceId,
			desiredSubDeviceState: {
				enabled,
			},
		}
	})
}
