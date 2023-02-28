import { Application, Request, Response } from 'express'
import { getMessage as getMessageFromInstance } from '../../agents/sofie-core/sofieCoreAgent'
import {
	createServiceMessage,
	getAllMessages,
	getMessage,
	removeServiceMessage,
	updateServiceMessage,
} from '../../data/serviceMessages/api'
import { remove, update } from '../../data/serviceMessages/dataStore'
import { DistributionStatus, ServiceMessage } from '../../data/serviceMessages/ServiceMessage'
import logger from '../../util/logger'
import { EndpointDescription } from '../api'

export { getEndpoints, registerServiceMessageApiHandlers }

const PATHNAME = 'serviceMessages'
const endpoints: { [index: string]: EndpointDescription } = {}

function registerServiceMessageApiHandlers(app: Application, rootPath: string): void {
	const path = `${rootPath}/${PATHNAME}`

	app.get(path, (req, res) => void listMessagesHandler(req, res))
	endpoints.list = { path, method: 'GET', useId: false }

	app.post(`${path}`, (req, res) => void createMessageHandler(req, res))
	endpoints.create = { path, method: 'POST', useId: false }

	app.get(`${path}/:id`, (req, res) => void getMessageHandler(req, res))
	endpoints.read = { path, method: 'GET', useId: true }

	app.post(`${path}/refreshPublishStates/:id`, (req, res) => void refreshPublishStatesHandler(req, res))
	endpoints.refreshPublishStates = {
		path: `${path}/refreshPublishStates`,
		method: 'POST',
		useId: true,
	}

	app.post(`${path}/:id`, (req, res) => void updateMessageHandler(req, res))
	endpoints.update = { path, method: 'POST', useId: true }

	app.delete(`${path}/:id`, (req, res) => void deleteMessageHandler(req, res))
	endpoints.delete = { path, method: 'DELETE', useId: true }
}

function getEndpoints(): { [index: string]: EndpointDescription } {
	return { ...endpoints }
}

async function listMessagesHandler(_req: Request, res: Response): Promise<void> {
	try {
		const messages: ServiceMessage[] = await getAllMessages()
		res.status(200).json(messages)
	} catch (err: any) {
		res.status(500).send(err.message)
	}
}

async function getMessageHandler(req: Request, res: Response): Promise<void> {
	const { id } = req.params
	try {
		const message = await getMessage(id)
		res.status(200).json(message)
	} catch (err: any) {
		res.status(500).send(err.message)
	}
}

async function createMessageHandler(req: Request, res: Response): Promise<void> {
	const { criticality, message, messageTarget } = req.body
	if (criticality && message && messageTarget) {
		logger.debug(`messageTarget is typeof ${typeof messageTarget}`, {
			messageTarget,
			requestBody: req.body,
		})
		try {
			const targetHosts = typeof messageTarget === 'string' ? [messageTarget] : messageTarget
			const created = await createServiceMessage(criticality, message, targetHosts)
			res.status(201).json(created)
		} catch (err: any) {
			res.status(500).send(err.message)
		}
	} else {
		res.status(400).send('Invalid input data')
	}
}

async function updateMessageHandler(req: Request, res: Response): Promise<void> {
	const { id } = req.params
	const { criticality, message } = req.body

	if (criticality && message) {
		try {
			const updated = await updateServiceMessage(id, criticality, message)
			res.status(200).json(updated)
		} catch (err: any) {
			res.status(500).send(err.message)
		}
	} else {
		res.status(400).send('Invalid input data')
	}
}

async function deleteMessageHandler(req: Request, res: Response): Promise<void> {
	const { id } = req.params
	let message: ServiceMessage

	try {
		message = await getMessage(id)
	} catch (err: any) {
		res.status(500).send(err.message)
		return
	}

	if (!message) {
		res.sendStatus(404)
		return
	}

	if (!message.isActive) {
		res.status(400).send(`Message ${message._id} is not active and therefore can't be deactivated`)
		return
	}

	try {
		await removeServiceMessage(id)
		message.isActive = false
		res.status(200).json(message)
	} catch (err: any) {
		res.status(500).send(err.message)
	}
}

async function refreshPublishStatesHandler(req: Request, res: Response): Promise<void> {
	const { id } = req.params
	try {
		const message = await getMessage(id)

		const updatedDistributions: DistributionStatus[] = []
		for (const status of message.distributions) {
			let isActive = false
			const { instance } = status

			const messageFromInstance = await getMessageFromInstance(id, instance)
			if (messageFromInstance) {
				// we found the message on the server
				isActive = true
			}

			updatedDistributions.push({ instance, isActive })
		}
		message.distributions = updatedDistributions

		// Update the status in the datastore, and delete the message if it's been
		// unpublished and no longer exists on any of the instances it was published to.
		if (message.isActive === false && message.distributions.every(({ isActive }) => isActive === false)) {
			const deletedMessage = await remove(message)
			res.status(200).json(deletedMessage)
		} else {
			const updatedMessage = await update(message)

			res.status(200).json(updatedMessage)
		}
	} catch (err: any) {
		res.status(500).send(err.message)
	}
}
