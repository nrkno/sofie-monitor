import { callAsyncAsCallback } from '../util/callAsyncAsCallback'
import { ServiceMessage } from '../data/serviceMessages/ServiceMessage'
import logger from '../util/logger'
import { Command } from './Command'
import { Action } from './Processor'
import { processors } from './processors'

export { distribute, recall }

// time in ms before retrying a failed request
const DEFAULT_JOB_WAITING_PERIOD_BEFORE_RETRY = 30000

/**
 * Distributes a message to all sofie-core instances listed.
 *
 * If the update flag is set to **false** a new message will be created on the
 * instances.
 * If the update flag is set to **true** a request to update the message with
 * the given id will be sent.
 *
 * Failed requests will be retried until they succeed. The status for each
 * instance will be updated when its request succeeds, meaning that the
 * distribution status for a given message is available from the message
 * registry.
 *
 * @param message the message to distribute
 * @param isUpdate set to true to distribute as an update
 */
function distribute(message: ServiceMessage, isUpdate = false): void {
	logger.debug(`Distributing ${isUpdate ? 'updated' : 'new'} service message ${message._id}`, {
		serviceMessage: message,
	})
	const command = isUpdate ? Command.UPDATE : Command.CREATE
	const { action, postAction } = processors[command]

	const jobs: Array<Job> = []

	for (const distribution of message.distributions) {
		const targetInstanceId = distribution.instance._id
		const messageId = message._id

		if (!targetInstanceId || !messageId) {
			logger.warn(
				`Unable to add job for message, missing ${targetInstanceId ? 'message id' : targetInstanceId}`,
				{ command, serviceMessage: message, instance: distribution.instance },
			)
			continue
		}

		jobs.push({
			command,
			messageId,
			targetInstanceId,
			action,
			postAction,
		})
	}

	logger.debug(`Created ${jobs.length} jobs`, { jobs })

	process(jobs)
}

/**
 * Recalls a message from all sofie-core instances listed.
 *
 * Failed requests will be retried until they succeed. The status for each
 * instance will be updated when its request succeeds, meaning that the
 * distribution status for a given message is available from the message
 * registry.
 *
 * When the message has been successfully recalled from all sofie-core
 * instances the message will be deleted from the message registry.
 *
 * @param message the message to recall
 */
function recall(message: ServiceMessage): void {
	const { action, postAction } = processors[Command.DELETE]

	const jobs: Array<Job> = []

	for (const distribution of message.distributions) {
		const targetInstanceId = distribution.instance._id
		const messageId = message._id

		if (!targetInstanceId || !messageId) {
			logger.warn(
				`Unable to add job for message, missing ${targetInstanceId ? 'message id' : targetInstanceId}`,
				{ command: Command.DELETE, serviceMessage: message, instance: distribution.instance },
			)
			continue
		}

		jobs.push({
			command: Command.DELETE,
			messageId,
			targetInstanceId,
			action,
			postAction,
		})
	}

	logger.debug(`Created ${jobs.length} jobs`, { jobs })

	process(jobs)

	process(jobs)
}

interface Job {
	command: Command
	messageId: string
	targetInstanceId: string
	action: Action
	actionCompleted?: boolean
	postAction: Action
	postActionCompleted?: boolean
	waitingTimeBeforeRetry?: number
	attempts?: number
}

async function retryingExecution(job: Job): Promise<void> {
	logger.debug('Processing job', { job })
	job.attempts = job.attempts ? job.attempts + 1 : 1
	try {
		if (!job.actionCompleted) {
			logger.debug('Executing action', { job })
			await job.action(job.messageId, job.targetInstanceId)
			job.actionCompleted = true
			logger.debug('Action completed', { job })
		}
		if (!job.postActionCompleted) {
			logger.debug('Executing post action', { job })
			await job.postAction(job.messageId, job.targetInstanceId)
			job.postActionCompleted = true
			logger.debug('Post action completed', { job })
		}
		logger.debug('Job completed', { job })
	} catch (error: any) {
		logger.warn(`Job failed at attempt ${job.attempts}`, { job, error })
		// TODO: cancel job after some condition?
		if (error.shouldNotRetry) {
			logger.warn(`Aborting job after ${job.attempts}: ${error.message}`, { job, error })
		} else {
			setTimeout(
				() => callAsyncAsCallback(retryingExecution, undefined, job),
				job.waitingTimeBeforeRetry ?? DEFAULT_JOB_WAITING_PERIOD_BEFORE_RETRY,
			)
		}
	}
}

function process(jobs: Array<Job>): void {
	for (const job of jobs) {
		job.attempts = 0
		job.waitingTimeBeforeRetry = DEFAULT_JOB_WAITING_PERIOD_BEFORE_RETRY
		setTimeout(() => callAsyncAsCallback(retryingExecution, undefined, job), 1)
	}
}
