import Nedb from '@seald-io/nedb'
import { URL } from 'url'
import { SofieInstance } from './SofieInstance'

export { create, remove, findByURL, list, read, update, parseStored, convertToStorable }

const dataStore = new Nedb({
	filename: 'data/sofieInstances.db',
	autoload: true,
})
// index documents by host URL, and ensure unique host URLs
dataStore.ensureIndex({ fieldName: 'url', unique: true })

async function create(instance: SofieInstance): Promise<SofieInstance> {
	return new Promise((resolve, reject) => {
		if (instance._id) {
			reject('Trying to create instance which has an id already. Use update?')
		}

		const storableInstance = convertToStorable(instance)
		dataStore.insert(storableInstance, (err: Error | null, insertedInstance: any) => {
			if (err) {
				return reject(err)
			}

			try {
				return resolve(parseStored(insertedInstance))
			} catch (e: any) {
				return reject(e)
			}
		})
	})
}

async function list(): Promise<SofieInstance[]> {
	return new Promise((resolve, reject) => {
		dataStore.find({}, (err: Error, instances: any[]) => {
			if (err) {
				return reject(err)
			}

			try {
				return resolve(instances.map(parseStored))
			} catch (e: any) {
				return reject(e)
			}
		})
	})
}

async function findByURL(url: URL): Promise<SofieInstance | null> {
	return new Promise((resolve, reject) => {
		dataStore.findOne({ url: url.href }, (err: Error | null, instance: any) => {
			if (err) {
				return reject(err)
			}

			if (!instance) {
				return resolve(null)
			}

			try {
				return resolve(parseStored(instance))
			} catch (e: any) {
				return reject(`Unable to parse document with URL ${url}: ${e.message}`)
			}
		})
	})
}

async function read(id: string): Promise<SofieInstance> {
	return new Promise((resolve, reject) => {
		dataStore.findOne({ _id: id }, (err: Error | null, instance: any) => {
			if (err) {
				return reject(err)
			}

			try {
				return resolve(parseStored(instance))
			} catch (e: any) {
				return reject(`Unable to read document with id ${id}: ${e.message}`)
			}
		})
	})
}

async function update(instance: SofieInstance): Promise<SofieInstance> {
	const { _id } = instance
	return new Promise((resolve, reject) => {
		if (!_id) {
			reject('Unable to update instance with no id. Use create?')
		}
		const storableInstance = convertToStorable(instance)
		dataStore.update(
			{ _id },
			storableInstance,
			{ multi: false, upsert: false, returnUpdatedDocs: true },
			(err: Error | null, numAffected: number, affectedDocument: any) => {
				if (err) {
					return reject(err)
				}

				if (numAffected !== 1 && affectedDocument == null) {
					reject(new Error(`Expected 1 instance to be updated, but was ${numAffected}`))
				}

				try {
					return resolve(parseStored(affectedDocument))
				} catch (e: any) {
					reject(`Unknown data error in stored document: ${e.message}`)
				}
			}
		)
	})
}

async function remove(instance: SofieInstance): Promise<SofieInstance> {
	const { _id } = instance
	return new Promise((resolve, reject) => {
		if (!_id) {
			reject('Unable to remove instance with no id. Not in database?')
		}
		dataStore.remove({ _id }, (err, countRemoved) => {
			if (err) {
				reject(err)
			}

			if (countRemoved === 1) {
				resolve(instance)
			} else {
				reject(`Expected 1 instance to be removed, but was ${countRemoved}`)
			}
		})
	})
}

/**
 * Creates a typed SofieInstance object from a serialized version from the database
 *
 * @param data serialized data
 * @returns a typed object
 * @throws if the data can't be parsed (invalid input)
 */
function parseStored(data: Record<string, any>): SofieInstance {
	if (!data) {
		throw new Error('No input')
	}
	data.url = new URL(data.url)

	return data as SofieInstance
}

/**
 * Serializes a SofieInstance object for database storage
 *
 * @param instance a server instance
 * @returns the serialized object
 */
function convertToStorable(instance: SofieInstance): any {
	const url = instance.url.href
	return Object.assign({}, instance, {
		url,
	})
}
