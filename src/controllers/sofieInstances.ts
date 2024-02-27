import { Application, Request, Response } from 'express'
import { callAsyncAsCallback } from '../util/callAsyncAsCallback'
import logger from '..//util/logger'
import { getEndpoints } from '../api/sofieInstances/api'
import { getAllInstances } from '../data/sofieInstances/api'
import { getQuerystringParamValues, getServerData } from '../lib/lib'
import { addInstancesFromQuerystringParam } from '../middleware/autoaddInstances'
import { RequestWithInstances } from '../RequestExtension'

export { formName, registerSofieInstancesHandler }

const formName = 'add-sofie-instance'

function registerSofieInstancesHandler(app: Application): void {
	app.get(
		'/sofieInstances',
		(req, res, next) => {
			callAsyncAsCallback(addInstancesFromQuerystringParam, undefined, req as RequestWithInstances, res, next)
		},
		(req, res) => callAsyncAsCallback(getHandler, undefined, req, res),
	)
	logger.debug('registered sofieInstances route')
}

async function getHandler(req: Request, res: Response): Promise<void> {
	try {
		const hosts = []
		for (const value of getQuerystringParamValues(req, 'servers')) {
			hosts.push(...value.split(','))
		}

		const servers = await getServerData(hosts)
		const instances = await getAllInstances()
		const endpoints = getEndpoints()

		res.render('sofieInstances', {
			title: 'Sofie Instances',
			servers: servers.map((server: any) => {
				return { ...server, host: server._host }
			}),
			formName,
			endpoints,
			instances,
			req,
		})
	} catch (error: any) {
		logger.error(`Unable to show sofieInstances view: ${error.message}`)
		res.status(500).send(error.message)
	}
}
