import { Request } from 'express'
import fetch from 'node-fetch'
import { URL, URLSearchParams } from 'url'

const HEALTH_PATH = 'health'
const EXT_VERSIONS = ['external/sisyfos/health']

export async function getServerHealth(serverHost: string): Promise<any> {
	if (serverHost !== '') {
		const serverLocation = /^https?:\/\//.test(serverHost) ? new URL(serverHost) : new URL(`http://${serverHost}`)
		const url = `${serverLocation.href}${HEALTH_PATH}`

		try {
			const response = await fetch(url, { method: 'GET' })
			return await response.json()
		} catch (error) {
			return {
				error: new Error(`Unable to fetch resource ${url}: ${error}`),
			}
		}
	} else {
		return {
			error: {
				message: 'No URL provided',
			},
		}
	}
}

export async function getExternalVersions(serverHost: string): Promise<PromiseSettledResult<any>[]> {
	const result: any[] = []
	if (serverHost !== '') {
		const serverLocation = /^https?:\/\//.test(serverHost) ? new URL(serverHost) : new URL(`http://${serverHost}`)

		return Promise.allSettled(
			EXT_VERSIONS.map(async (extUrl) => {
				const url = `${serverLocation.href}${extUrl}`

				try {
					const response = await fetch(url, { method: 'GET' })
					return await response.json()
				} catch (error) {
					return {
						error: new Error(`Unable to fetch resource ${url}: ${error}`),
					}
				}
			})
		)
	}

	return result
}

/**
 * Accepts a list of server hosts and returns the responses from a query to
 * each server's /health service.
 *
 * @param serverHosts - an array of server hosts as strings
 * @returns an array of data objects
 */
export async function getServerData(serverHosts: Array<string>): Promise<Array<any>> {
	if (!serverHosts.length) {
		return []
	}

	return Promise.all(
		serverHosts.map(async (host) => {
			const serverHealth = await getServerHealth(host)
			serverHealth._extVersions = await getExternalVersions(host)
			serverHealth._host = host
			return serverHealth
		})
	)
}

export function getQuerystringParamValues(req: Request, name: string): string[] {
	const { url } = req

	if (url?.indexOf('?') > -1) {
		const queryString = url.substring(url.indexOf('?') + 1)
		const params = new URLSearchParams(queryString)
		if (params.has(name)) {
			return params.getAll(name)
		}
	}

	return []
}
