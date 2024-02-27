import Nedb from '@seald-io/nedb'
import { URL } from 'url'
import logger from '../../util/logger'
import { DistributionStatus, ServiceMessage } from './ServiceMessage'

export { create, remove, list, read, update }

const dataStore = new Nedb({
	filename: 'data/serviceMessages.db',
	autoload: true,
})

async function create(message: ServiceMessage): Promise<ServiceMessage> {
	return new Promise((resolve, reject) => {
		if (message._id) {
			reject('Trying to create message which has an id already. Use update?')
		}

		const storableMessage = convertToStorable(message)
		dataStore.insert(storableMessage, (err: Error | null, insertedMessage: any) => {
			if (err) {
				return reject(err)
			}

			try {
				return resolve(parseStored(insertedMessage))
			} catch (e: any) {
				return reject(e)
			}
		})
	})
}

async function list(): Promise<ServiceMessage[]> {
	return new Promise((resolve, reject) => {
		dataStore.find({}, (err: Error | null, messages: ServiceMessage[]) => {
			if (err) {
				return reject(err)
			}

			try {
				return resolve(messages.map(parseStored))
			} catch (e: any) {
				return reject(e)
			}
		})
	})
}

async function read(id: string): Promise<ServiceMessage> {
	return new Promise((resolve, reject) => {
		dataStore.findOne({ _id: id }, (err: Error | null, message: ServiceMessage) => {
			if (err) {
				return reject(err)
			}

			try {
				return resolve(parseStored(message))
			} catch (e: any) {
				return reject(`Unable to read document with id ${id}: ${e.message}`)
			}
		})
	})
}

async function update(message: ServiceMessage): Promise<ServiceMessage> {
	const { _id } = message
	return new Promise((resolve, reject) => {
		if (!_id) {
			reject('Unable to update message with no id. Use create?')
		}

		const storableMessage = convertToStorable(message)
		dataStore.update(
			{ _id },
			storableMessage,
			{ multi: false, upsert: false, returnUpdatedDocs: true },
			(err: Error | null, numAffected: number, affectedDocument: any) => {
				if (err) {
					return reject(err)
				}

				if (numAffected !== 1) {
					return reject(`Expected 1 message to be updated, but was ${numAffected}`)
				}

				try {
					return resolve(parseStored(affectedDocument))
				} catch (e: any) {
					reject(`Unknown data error in stored document: ${e.message}`)
				}
			},
		)
	})
}

async function remove(message: ServiceMessage): Promise<ServiceMessage> {
	const { _id } = message

	return new Promise((resolve, reject) => {
		if (!_id) {
			reject('Unable to remove message with no id.')
		}
		dataStore.remove({ _id }, {}, (err: Error | null, numAffected: number) => {
			if (err) {
				return reject(err)
			}

			if (numAffected === 1) {
				return resolve(message)
			} else {
				return reject(`Expected 1 message to be removed, but was ${numAffected}`)
			}
		})
	})
}

/**
 * Creates a typed ServiceMessage object from a serialized version from the database
 *
 * @param data serialized data
 * @returns a typed object
 * @throws if the data can't be parsed (invalid input)
 */
function parseStored(data: any): ServiceMessage {
	const { _id, criticality, message, sender, timestamp, isActive } = data

	const distributions: DistributionStatus[] = []

	for (const distribution of data.distributions) {
		const instance = { ...distribution.instance }
		instance.url = new URL(distribution.instance.url)

		const distributionStatus = Object.assign({}, distribution, {
			instance,
		})

		distributions.push(distributionStatus)
	}

	const serviceMessage: ServiceMessage = {
		_id,
		criticality,
		message,
		sender,
		timestamp,
		isActive,
		distributions,
	}

	return serviceMessage
}

/**
 * Serialiazes a ServiceMessage object for database storage
 *
 * @param message a service message
 * @returns the converted object ready for database insertion
 */
function convertToStorable(message: ServiceMessage): any {
	const distributions = message.distributions.map((distribution) => {
		try {
			const url = distribution.instance.url.href
			return Object.assign({}, distribution, {
				instance: Object.assign({}, distribution.instance, {
					url,
				}),
			})
		} catch (err: any) {
			const msg = 'Unable to convert distribution status instance to storable'
			logger.debug(msg, { distribution, error: err })
			throw new Error(`${msg}: ${err.message}`)
		}
	})

	return Object.assign({}, message, {
		distributions,
	})
}
