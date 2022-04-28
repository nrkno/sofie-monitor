import { Request, Response } from 'express'
import { RequestWithTimer } from '../RequestExtension.d'
import { getQuerystringParamValues, getServerData } from '../lib/lib'
import { getAllInstances } from '../data/sofieInstances/api'

function parseServerResponsesToStatusMessages(resp: any): any {
	if (resp.error) {
		return {
			host: resp._host,
			error: resp,
		}
	}

	return {
		host: resp._host,
		name: resp.name,
		instanceId: resp.instanceId,
		status: resp.status,
		statusMessage: resp.statusMessage || '',
		components: (resp.components || []).map((component: any) => {
			return {
				name: component.name,
				status: component.status,
				statusMessage: component.statusMessage || '',
			}
		}),
	}
}

export async function statusMessage(req: Request, res: Response) {
	const hosts = []
	for (const value of getQuerystringParamValues(req, 'servers')) {
		if (value.trim()) {
			hosts.push(...value.split(','))
		}
	}

	if (!hosts.length) {
		const instances = await getAllInstances()
		for (const instance of instances) {
			hosts.push(instance.url.href)
		}
	}

	if (hosts.length) {
		try {
			const servers = (await getServerData(hosts)).map(parseServerResponsesToStatusMessages)

			res.render('serverStatusMessages', {
				title: 'Server Status Messages',
				servers,
				req: req,
				refreshTimer: (req as RequestWithTimer).refreshTimer,
			})
		} catch (err: any) {
			console.error(err)
			res.status(500).send(err.message)
		}
	} else {
		res.status(400).send('No server provided. Please add ?servers=SERVER1,SERVER2,SERVER3')
	}
}
