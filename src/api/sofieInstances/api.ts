import { Application, Request, Response } from 'express'
import { URL } from 'url'
import {
	addInstance,
	deleteInstance,
	getInstance,
	getInstanceByHost,
	refreshFromServer,
} from '../../data/sofieInstances/api'
import logger from '../../util/logger'
import { EndpointDescription } from '../api'

export { getEndpoints, registerSofieInstancesApiHandlers }

const PATHNAME = 'sofieInstances'
const endpoints: { [index: string]: EndpointDescription } = {}

function registerSofieInstancesApiHandlers(app: Application, rootPath: string): void {
	const path = `${rootPath}/${PATHNAME}`

	app.post(path, createInstanceHandler)
	endpoints.create = { path, method: 'POST' }

	app.put(`${path}/:id`, updateInstanceHandler)
	endpoints.update = { path, method: 'PUT', useId: true }

	app.delete(`${path}/:id`, deleteInstanceHandler)
	endpoints.delete = { path, method: 'DELETE', useId: true }
}

function getEndpoints(): { [index: string]: EndpointDescription } {
	return { ...endpoints }
}

async function createInstanceHandler(req: Request, res: Response) {
	const { url } = req.body

	if (!url) {
		return res.status(400).send('Missing input: URL')
	}

	try {
		const location = new URL(url)
		const found = await getInstanceByHost(location)

		if (found) {
			return res.status(400).send(`Resource with url ${location.href} already exists and thus can't be created`)
		}

		const created = await addInstance(location)
		return res.status(200).json(created)
	} catch (err: any) {
		logger.error(`Unable to create instance using URL ${url}:`, { error: err })
		return res.status(500).send(err.message)
	}
}

async function updateInstanceHandler(req: Request, res: Response) {
	const id = req.params.id

	try {
		const found = await getInstance(id)

		if (!found) {
			return res.status(404).send(`No entry with id ${id}`)
		}

		const updated = await refreshFromServer(found)
		return res.status(200).json(updated)
	} catch (err: any) {
		logger.error(`Unable to update instance using id ${id}: ${err.message}`)
		return res.status(500).send(err.message)
	}
}

async function deleteInstanceHandler(req: Request, res: Response) {
	const id = req.params.id

	try {
		const found = await getInstance(id)

		if (!found) {
			return res.status(404).send(`No entry with id ${id}`)
		}

		const deleted = await deleteInstance(found)
		return res.status(200).json(deleted)
	} catch (err: any) {
		logger.error(`Unable to delete instance using id ${id}: ${err.message}`)
		return res.status(500).send(err.message)
	}
}
