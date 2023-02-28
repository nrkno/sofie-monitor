import { URL } from 'url'
import { SofieInstance } from '../SofieInstance'

export { create, remove, findByURL, list, read, update, parseStored, convertToStorable }

async function create(instance: SofieInstance): Promise<SofieInstance> {
	return {
		...instance,
		_id: `mock${instance._id || Math.floor(Math.random() * 1000)}`,
	}
}

async function list(): Promise<SofieInstance[]> {
	const instance: SofieInstance = {
		name: 'fakeSofie',
		url: new URL('http://localhost:3000'),
		_id: `mock${Math.floor(Math.random() * 1000)}`,
	}

	return [instance]
}

async function findByURL(url: URL): Promise<SofieInstance | null> {
	return {
		name: 'fakeSofie',
		url,
		_id: `mock${Math.floor(Math.random() * 1000)}`,
	}
}

async function read(id: string): Promise<SofieInstance> {
	return {
		name: 'fakeSofie',
		url: new URL('http://localhost:3000'),
		_id: id,
	}
}

async function update(instance: SofieInstance): Promise<SofieInstance> {
	return instance
}

async function remove(instance: SofieInstance): Promise<SofieInstance> {
	return instance
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
