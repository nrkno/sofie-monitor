import bodyParser from 'body-parser'
import compression from 'compression' // compresses requests
import express from 'express'
import path from 'path'
import { registerApiHandlers } from './api/api'
import { registerCoreControlHandler } from './controllers/coreControl'
import { registerGlobalMessageFormhandler } from './controllers/globalMessageForm'
import { registerHealthHandler } from './controllers/health'
import { statusMessage } from './controllers/serverStatus'
import { serverVersions } from './controllers/serverVersions'
import { registerSofieInstancesHandler } from './controllers/sofieInstances'
import { RequestWithTimer } from './RequestExtension'

// Allow all SSL certificates, this is a temporary solution (ish)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// added support for env variable to enable running monitor alongside core
// for development purposes
const port = process.env.SOFIE_MONITOR_PORT || 3000

// Create Express server
const app = express()

// Express configuration
app.set('port', port)
app.set('views', path.join(__dirname, '../views'))
app.set('view engine', 'pug')
app.use(compression())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }))

app.use((req, _res, next) => {
	const refresh = req.query.refresh
	if (refresh) {
		const refreshNumber = Number(refresh)
		if (refreshNumber > 0) {
			;(req as RequestWithTimer).refreshTimer = refreshNumber * 1000
		}
		return next() // Refresh of 0 or less => no refresh
	}

	;(req as RequestWithTimer).refreshTimer = 5 * 60 * 1000 // 5 minutes
	next()
})
/**
 * Primary app routes.
 */
registerHealthHandler(app)
app.get('/', statusMessage)
app.get('/statusMessage', statusMessage)
app.get('/serverVersions', (req, res) => {
	return serverVersions(req as RequestWithTimer, res)
})
registerGlobalMessageFormhandler(app)
registerSofieInstancesHandler(app)
registerCoreControlHandler(app)

// REST API handler registration
registerApiHandlers(app)

export default app
