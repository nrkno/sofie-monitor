export { Action, Processor, ProcessingError }

type Action = (messageId: string, targetInstanceId: string) => Promise<any>

interface Processor {
	action: Action
	postAction: Action
}

interface ProcessingError extends Error {
	shouldNotRetry?: boolean
}
