import { createLogger, format, transports } from 'winston'

const logger = createLogger()

if (process.env.NODE_ENV === 'production') {
	logger.add(
		new transports.Console({
			level: 'error',
			format: format.json(),
		})
	)
} else {
	const logLevel = process.env.DEBUG === 'true' ? 'debug' : 'warn'
	logger.add(
		new transports.Console({
			level: logLevel,
			format: format.combine(format.colorize(), format.simple()),
		})
	)
	logger.debug('Logging initialized at debug level')
}

export default logger
