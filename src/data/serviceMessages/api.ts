import { URL } from 'url'
import { distribute, recall } from '../../distribution/api'
import logger from '../../util/logger'
import { getAllInstances } from '../sofieInstances/api'
import { SofieInstance } from '../sofieInstances/SofieInstance'
import { create, list, read, update } from './dataStore'
import { Criticality, ServiceMessage } from './ServiceMessage'

export { createServiceMessage, getAllMessages, getMessage, removeServiceMessage, updateServiceMessage }

/**
 * Creates a new service message, stores it in the data store and queues it for
 * distribution to the asssigned sofie-core instances
 *
 * @param criticality
 * @param message
 * @param targetHosts
 *
 * @returns the created service message object
 */
async function createServiceMessage(
	criticality: Criticality,
	message: string,
	targetHosts: Array<string>
): Promise<ServiceMessage> {
	const instances = await getInstancesFromTargetHosts(targetHosts)
	logger.debug(`Got ${instances.length} instances from ${targetHosts.length} target hosts`, {
		targetHosts,
		instances,
	})
	const serviceMessage: ServiceMessage = {
		criticality,
		message,
		sender: 'sofie-monitor',
		timestamp: new Date(),
		isActive: true,
		distributions: instances.map((instance) => ({
			instance,
			isActive: false,
		})),
	}

	logger.debug(`Creating new message with ${targetHosts.length} target instances`, {
		serviceMessage,
		targetHosts,
	})
	const created = await create(serviceMessage)

	distribute(created)

	return created
}

/**
 * Fetches all messages currently in the data store, regardless of status
 */
async function getAllMessages(): Promise<ServiceMessage[]> {
	return list()
}

/**
 * Fetches the message matching the given id
 *
 * @param id the id for the message
 */
async function getMessage(id: string): Promise<ServiceMessage> {
	return read(id)
}

/**
 * Updates a service message and distributes the updated version to all instances.
 * Note that it is not possible to add or remove instances from the message in
 * an update. Only the criticality and message content can be changed.
 * The timestamp will be automatically updated.
 *
 * @param criticality
 * @param message
 *
 * @returns the updated service message object
 */
async function updateServiceMessage(id: string, criticality: Criticality, message: string): Promise<ServiceMessage> {
	const serviceMessage = await read(id)
	serviceMessage.criticality = criticality
	serviceMessage.message = message
	serviceMessage.timestamp = new Date()

	const updated = await update(serviceMessage)

	distribute(updated, true)

	return updated
}

/**
 * Deactivates a message and queues it for removal from all sofie-core instances
 * it has been distributed to.
 * TODO: Any pending distribution jobs will be canceled.
 *
 * Note that the message will be deleted from the data store when removal is
 * completed for **all** instances it has been distributed to.
 *
 * @param id
 */
async function removeServiceMessage(id: string): Promise<ServiceMessage> {
	// deactive messages (message.isActive = false)
	const message = await getMessage(id)

	if (!message.isActive) {
		const errorMessage = `Trying to deactive already inactive message ${message._id}`
		logger.error(errorMessage)
		throw new Error(errorMessage)
	}

	message.isActive = false
	const updated = await update(message)

	// start taking it down from servers
	recall(updated)

	// the message isn't actually deleted from the database until it is deactived from all servers
	return updated
}

async function getInstancesFromTargetHosts(targetHosts: Array<string>): Promise<Array<SofieInstance>> {
	const allInstances = await getAllInstances()
	const instancesFromTargetHost: Array<SofieInstance> = []

	for (const url of targetHosts) {
		const targetUrl = new URL(url).href
		const candidate = allInstances.find((i) => i.url.href === targetUrl)
		if (candidate) {
			instancesFromTargetHost.push(candidate)
		}
	}

	return instancesFromTargetHost
}
