import { Application, Request, Response } from 'express'

/**
 * Registers a routehandler for a health service
 *
 * @param app application to register a routehandler for
 */
export function registerHealthHandler(app: Application): void {
	app.get('/health', healthHandler)
}

function healthHandler(_req: Request, res: Response) {
	return res.status(200).json({
		status: 'OK',
		name: 'Sofie Monitor',
		updated: new Date(),
		documentation: 'https://github.com/nrkno/sofie-monitor',
	})
}
