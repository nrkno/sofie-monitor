import { createMessage, recallMessage, SofieCoreAgentError } from '../agents/sofie-core/sofieCoreAgent'
import * as messageStore from '../data/serviceMessages/dataStore'
import * as instanceStore from '../data/sofieInstances/dataStore'
import logger from '../util/logger'
import { Command } from './Command'
import { ProcessingError, Processor } from './Processor'

export { processors }

/* A server returning any of these indicates that the request should not be retried
 * Note that this is not a complete list of this type of statuses, but only what
 * can reasonably be expected from the sofie-core service messages REST API.
 */
const DO_NOT_RETRY_STATUSES = [400, 404, 405]

const processors: {
	[index: string]: Processor
} = {}

processors[Command.CREATE] = {
	action: async (messageId: string, targetInstanceId: string) => {
		try {
			const message = await messageStore.read(messageId)
			const target = await instanceStore.read(targetInstanceId)
			if (message.isActive) {
				await createMessage(message, target)
				logger.debug(`Message ${message._id} distributed to ${target.name}`)
			} else {
				logger.debug(`Aborted distribution for ${message._id}: message status is inactive`, {
					ServiceMessage: message,
					target,
				})
			}
		} catch (error: any) {
			logger.error(`Failed to distribute message ${messageId} to instance ${targetInstanceId}`, {
				error,
			})

			const procError: ProcessingError = new Error(error)
			procError.shouldNotRetry = shouldAvoidRetries(error)

			throw procError
		}
	},
	postAction: async (messageId: string, targetInstanceId: string) => {
		try {
			const target = instanceStore.read(targetInstanceId)
			const message = await messageStore.read(messageId)
			if (!message) {
				logger.debug(`Aborted distribution post action for ${messageId}, message not in datastore`)
				return
			}

			const { url, name } = await target
			const distribution = message.distributions.find((d) => d.instance.url.href === url.href)
			if (distribution) {
				distribution.isActive = true
			}

			await messageStore.update(message)
			logger.debug(`Message ${message._id} distribution status for ${name} updated`)
		} catch (error: any) {
			logger.error('Unable to complete post action', { messageId, targetInstanceId, error })
			throw new Error(error)
		}
	},
}

processors[Command.UPDATE] = {
	action: () => {
		throw new Error('Not implemented')
	},
	postAction: () => {
		throw new Error('Not implemented')
	},
}

processors[Command.DELETE] = {
	action: async (messageId: string, targetInstanceId: string) => {
		try {
			const message = await messageStore.read(messageId)
			if (!message) {
				logger.debug(
					`Aborted recall of message ${messageId} from ${targetInstanceId}, message is not in datastore`,
				)
				return
			}
			const target = await instanceStore.read(targetInstanceId)
			await recallMessage(message, target)
			logger.debug(`Recalled ${message._id} from ${target.name}`)
		} catch (error: any) {
			logger.error(`Failed to recall message ${messageId} from instance ${targetInstanceId}`, { error })

			const procError: ProcessingError = new Error(error)
			procError.shouldNotRetry = shouldAvoidRetries(error)

			throw procError
		}
	},
	postAction: async (messageId: string, targetInstanceId: string) => {
		try {
			const message = await messageStore.read(messageId)
			const target = await instanceStore.read(targetInstanceId)
			const distribution = message.distributions.find((d) => d.instance.url.href === target.url.href)
			if (distribution) {
				distribution.isActive = false
			}

			if (message.distributions.every((d) => !d.isActive)) {
				logger.debug(`Message ${message._id} has no active distributions, deleting message`)
				const deleted = await messageStore.remove(message)
				logger.debug(`Message ${deleted._id} deleted`)
			} else {
				const updated = await messageStore.update(message)
				logger.debug(`Message ${updated._id} distribution status for ${target.name} updated`)
			}
		} catch (error: any) {
			throw new Error(error)
		}
	},
}

function shouldAvoidRetries(error: SofieCoreAgentError): boolean {
	const { responseStatus } = error
	if (responseStatus && DO_NOT_RETRY_STATUSES.includes(responseStatus)) {
		return true
	}

	return false
}
