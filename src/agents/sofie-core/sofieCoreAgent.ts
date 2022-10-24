import fetch, { RequestInit, RequestRedirect, Response } from 'node-fetch'
import { URL } from 'url'
import { ServiceMessage } from '../../data/serviceMessages/ServiceMessage'
import { SofieInstance } from '../../data/sofieInstances/SofieInstance'
import logger from '../../util/logger'

export { createMessage, getMessage, recallMessage, SofieCoreAgentError, sendUserActionApiPostRequest }

interface SofieCoreAgentError extends Error {
	responseStatus?: number
}

const REMOTE_SERVICEMESSAGE_API_PATH = 'serviceMessages'
const USER_ACTION_API_PATH = '/sofie/api/0/action'

const defaultOptions: { redirect: RequestRedirect } = {
	/* sofie-core redirects non-existing paths to index, which returns 200 OK.
	 That is all kinds of bad for a REST API client, so we'll treat redirects as errors */
	redirect: 'error',
}
const defaultHeaders = {
	// TODO: compliance
	'User-Agent': `sofie-monitor/sofie-core agent (node-fetch v2)`,
}

logger.debug('sofie-core agent inited with default options and headers', {
	defaultOptions,
	defaultHeaders,
})

/**
 * Publish a service message to a specified sofie-core instance.
 *
 *
 * @param message the service message to publish
 * @param instance the sofie-core instance to publish the message to
 */
async function createMessage(message: ServiceMessage, instance: SofieInstance): Promise<void> {
	const data = {
		id: message._id,
		criticality: message.criticality,
		message: message.message,
		sender: message.sender,
		timestamp: message.timestamp,
	}

	try {
		logger.info(`Creating message ${data.id}`, message, instance)

		const targetUrl = new URL(instance.url.href)
		targetUrl.pathname = REMOTE_SERVICEMESSAGE_API_PATH
		const response = await fetch(
			targetUrl.href,
			Object.assign({}, defaultOptions, {
				method: 'post',
				body: JSON.stringify(data),
				headers: Object.assign({}, defaultHeaders, {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				}),
			})
		)
		await checkResponse(response, [200, 201])

		// Hack to catch situations where an instance without the API implementation is
		// queried. Meteor defaults to showing the frontpage instead of returning a 404
		// when requesting a non-existing resource.
		// Since the sofie-core API implementation returns JSON for completed POST
		// requests, this will throw an error when the response is not a valid JSON
		// document, which the sofie-core frontpage isn't.
		await response.json()
	} catch (err: any) {
		const errorMessage = `Unable to create message ${message._id} on ${instance.name}`
		logger.error(errorMessage, { serviceMessage: message, instance, err })

		if (err.responseStatus) {
			// Already packed into a custom error by checkResponse, rethrow
			throw err
		}

		throw new Error(`${errorMessage}: ${err.message}`)
	}
}

/**
 * Recall a message previously published to a sofie-core instance.
 *
 *
 * @param message the message to recall
 * @param instance the instance to recall the message from
 */
async function recallMessage(message: ServiceMessage, instance: SofieInstance): Promise<void> {
	const id = message._id

	try {
		logger.debug(`Recalling message ${id}`, { serviceMessage: message, instance })

		const targetUrl = new URL(instance.url.href)
		targetUrl.pathname = `${REMOTE_SERVICEMESSAGE_API_PATH}/${id}`
		const response = await fetch(
			targetUrl.href,
			Object.assign({}, defaultOptions, { method: 'delete', headers: defaultHeaders })
		)
		await checkResponse(response, [200, 404])

		if (response.status === 404) {
			// if the message doesn't exist on the server we consider that as a succesful recall ¯\_(ツ)_/¯
			return
		}

		// Hack to catch situations where an instance without the API implementation is
		// queried. Meteor defaults to showing the frontpage instead of returning a 404
		// when requesting a non-existing resource.
		// Since the sofie-core API implementation returns JSON for completed DELETE
		// requests, this will throw an error when the response is not a valid JSON
		// document, which the sofie-core frontpage isn't.
		await response.json()
	} catch (err: any) {
		const errorMessage = `Unable to recall message ${message._id} from ${instance.name}`
		logger.error(errorMessage, { serviceMessage: message, instance, err })

		if (err.responseStatus) {
			// Already packed into a custom error by checkResponse, rethrow
			throw err
		}

		throw new Error(`${errorMessage}: ${err.message}`)
	}
}

/**
 * Retrieve a service message from a sofie core instance.
 *
 * @param id the id of the service message to retrieve
 * @param instance the Sofie core instance to retrieve it from
 */
async function getMessage(id: string, instance: SofieInstance): Promise<ServiceMessage | null> {
	try {
		const targetUrl = new URL(instance.url.href)
		targetUrl.pathname = `${REMOTE_SERVICEMESSAGE_API_PATH}/${id}`
		const response = await fetch(
			targetUrl.href,
			Object.assign({}, defaultOptions, {
				method: 'get',
				headers: Object.assign({}, defaultHeaders, {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				}),
			})
		)
		await checkResponse(response, [200, 404])
		if (response.status === 404) {
			return null
		}
		const retrievedMessage = await response.json()

		return {
			_id: retrievedMessage.id,
			criticality: retrievedMessage.criticality,
			message: retrievedMessage.message,
			isActive: true,
			distributions: [{ instance, isActive: true }],
			timestamp: retrievedMessage.timestamp,
		}
	} catch (err: any) {
		const errorMessage = `Unable to retrieve message ${id} from ${instance.name}`
		logger.error(errorMessage, { serviceMessageId: id, instance, err })

		if (err.responseStatus) {
			// Already packed into a custom error by checkResponse, rethrow
			throw err
		}

		throw new Error(`${errorMessage}: ${err.message}`)
	}
}

/**
 * Sends a user action API POST request using the given path and optionally a payload
 *
 * @param href the Sofie instance address to perform the API request on
 * @param actionPath the path to the action, not including the path to the API root
 * @param _payload optional payload
 * @throws if something goes wrong
 * @returns
 */
async function sendUserActionApiPostRequest(href: string, actionPath: string, payload?: any): Promise<any | null> {
	if (actionPath.trim() === '') {
		throw new Error('Unable to send user action POST request, path to action is empty')
	}

	try {
		const targetUrl = new URL(href)
		targetUrl.pathname = `${USER_ACTION_API_PATH}/${actionPath}`

		const options: RequestInit = Object.assign({}, defaultOptions, {
			method: 'post',
			headers: Object.assign({}, defaultHeaders, {
				Accept: 'application/json',
			}),
		})

		if (payload) {
			options.headers = Object.assign({}, options.headers, { 'Content-Type': 'application/json' })
			options.body = JSON.stringify(payload)
		}

		const response = await fetch(targetUrl.href, options)

		await checkResponse(response, [200, 204, 404]) //TODO: expand with all possible status codes for an API POST request (check core source)
		if (response.status === 404) {
			const err: SofieCoreAgentError = new Error(`Could not find user action path ${actionPath}`)
			err.responseStatus = 404

			throw err
		}

		// parse response body if exists, return null if not or if not json
		if (response.status !== 204 && Number(response.headers.get('Content-Length')) > 0) {
			try {
				const responsePayload = await response.json()
				return Object.keys(responsePayload).length > 0 ? responsePayload : true
			} catch (err: any) {
				return null
			}
		} else {
			return null
		}
	} catch (err: any) {
		const errorMessage = `Unable to POST user action request: ${err.message}`
		logger.error(errorMessage, { instance: href, actionPath, payload, err })

		if (err.responseStatus) {
			// Already packed into a custom error by checkResponse, rethrow
			throw err
		}

		throw new Error(`${errorMessage}: ${err.message}`)
	}
}

async function checkResponse(response: Response, allowed: Array<number>): Promise<void> {
	if (allowed.indexOf(response.status) < 0) {
		const message = await response.text()
		const err: SofieCoreAgentError = new Error(
			`Unexpected response HTTP ${response.status} ${message}, wanted one of ${allowed.join(',')}!`
		)
		err.responseStatus = response.status

		throw err
	}
}
