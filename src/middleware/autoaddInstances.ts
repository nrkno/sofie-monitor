import { Request, Response, NextFunction } from 'express'
import { URL } from 'url'
import { addInstance, getInstanceByHost } from '../data/sofieInstances/api'
import { SofieInstance } from '../data/sofieInstances/SofieInstance'
import { getQuerystringParamValues } from '../lib/lib'
import { RequestWithInstances } from '../RequestExtension'
import logger from '../util/logger'

export { addInstancesFromQuerystringParam }

/**
 * Reads the <pre>servers</pre> querystring parameter value and attempts to add
 * all hosts listed as a new instance in the internal registry if they don't
 * exist already.
 *
 * After adding them to the registry they are added to the request object's
 * instances property for use by controllers.
 *
 * @param req
 * @param res
 * @param next
 */
async function addInstancesFromQuerystringParam(
	req: RequestWithInstances,
	_res: Response,
	next: NextFunction
): Promise<void> {
	try {
		const hosts = []
		for (const value of getQuerystringParamValues(req as Request, 'servers')) {
			hosts.push(...value.split(','))
		}

		req.instances = req.instances || []

		for (const host of hosts) {
			try {
				const instance = await getOrCreateInstance(host)
				req.instances.push(instance)
			} catch (error) {
				logger.warn(`Can't get data for Sofie Instance ${host}, unable to add to instance register`)
			}
		}

		next()
	} catch (error) {
		next(error)
	}
}

/**
 * Retrieve a previously stored from or add a new instance to the internal registry of sofie-core instances.
 *
 * @param urlString either a full or partial url to a sofie-core instance. If protocol is missing https will be used
 */
async function getOrCreateInstance(urlString: string): Promise<SofieInstance> {
	const url = /^https?:\/\//.test(urlString) ? new URL(urlString) : new URL(`https://${urlString}`)
	const found = await getInstanceByHost(url)
	return found ? found : addInstance(url)
}
