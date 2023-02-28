import { Application, Request, Response } from 'express'
import logger from '../util/logger'
import { getEndpoints } from '../api/serviceMessages/api'
import { getAllMessages } from '../data/serviceMessages/api'
import { Criticality } from '../data/serviceMessages/ServiceMessage'
import { getAllInstances } from '../data/sofieInstances/api'
import { formatDateTime } from '../lib/dateFormat'
import { getQuerystringParamValues, getServerData } from '../lib/lib'

export function registerGlobalMessageFormhandler(app: Application): void {
	app.get('/globalMessageForm', (req, res) => void getHandler(req, res))
	logger.debug('registered globalMessageForm route')
}

async function getHandler(req: Request, res: Response): Promise<void> {
	const hosts = []
	for (const value of getQuerystringParamValues(req, 'servers')) {
		hosts.push(...value.split(','))
	}

	const servers = await getServerData(hosts)
	const messages = await getAllMessages()
	const instances = getAllInstances()
	const endpoints = getEndpoints()

	res.render('globalMessageForm', {
		title: 'Service Messages',
		servers: servers.map((server: any) => {
			return { ...server, host: server._host }
		}),
		formatDateTime,
		translateCriticalityToBootstrapContext,
		endpoints,
		instances: await instances,
		activeMessages: messages.filter((message) => message.isActive === true),
		inactiveMessages: messages.filter((message) => message.isActive !== true),
		req,
	})
}

function translateCriticalityToBootstrapContext(criticality: string) {
	switch (Number(criticality)) {
		case Criticality.CRITICAL:
			return 'danger'
		case Criticality.WARNING:
			return 'warning'
		case Criticality.NOTIFICATION:
		default:
			return 'info'
	}
}
