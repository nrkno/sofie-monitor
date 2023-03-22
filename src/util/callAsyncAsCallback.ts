import logger from './logger'

export function callAsyncAsCallback<T>(
	asyncMethod: (...args: any[]) => Promise<T>,
	callback?: (err: Error | null, result?: T) => void,
	...args: any[]
): void {
	asyncMethod(...args)
		.then((result) => {
			if (typeof callback === 'function') {
				callback(null, result)
			}
		})
		.catch((err) => {
			if (typeof callback !== 'function') {
				logger.error(err)
				return
			}
			callback(err)
		})
}
