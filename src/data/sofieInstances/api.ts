import { URL } from 'url'
import { getServerHealth } from '../../lib/lib'
import { create, findByURL, list, read, remove, update } from './dataStore'
import { SofieInstance } from './SofieInstance'

export {
	addInstance,
	deleteInstance,
	getAllInstances,
	getInstance,
	getInstanceByHost,
	refreshInstanceFromServer as refreshFromServer,
}

async function addInstance(url: URL): Promise<SofieInstance> {
	try {
		const name = await getInstanceName(url)
		const instance: SofieInstance = { url, name }
		return await create(instance)
	} catch (error: any) {
		throw new Error(error)
	}
}

function getInstance(id: string): Promise<SofieInstance> {
	return read(id)
}

function getInstanceByHost(url: URL): Promise<SofieInstance | null> {
	return findByURL(url)
}

function getAllInstances(): Promise<SofieInstance[]> {
	return list()
}

async function refreshInstanceFromServer(instance: SofieInstance): Promise<SofieInstance> {
	const { _id } = instance
	if (!_id) {
		throw new Error(`Unable to refresh instance without id: ${JSON.stringify(instance)}`)
	}
	const found = await getInstance(_id)
	if (!found) {
		throw new Error(`No entry for Sofie instance with id ${_id}`)
	}

	instance.name = await getInstanceName(instance.url)
	return update(instance)
}

async function deleteInstance(instance: SofieInstance): Promise<SofieInstance> {
	return remove(instance)
}

async function getInstanceName(url: URL): Promise<string> {
	const serverData: any = await getServerHealth(url.href)
	if (serverData.error) {
		throw new Error(serverData.error.message)
	}
	// default name isn't useful, so replace with hostname
	return serverData.name === 'Sofie Automation system' ? url.hostname : serverData.name
}
