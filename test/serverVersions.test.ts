jest.mock('node-fetch')
jest.mock('../src/data/sofieInstances/dataStore.ts')

import fetch from 'node-fetch'
const { Response } = jest.requireActual('node-fetch')

import request from 'supertest'
import app from '../src/app'

import { JSDOM } from 'jsdom'

const exampleHealth = {
	status: 'OK',
	name: 'Sofie Automation system',
	updated: new Date(),
	documentation: 'https://github.com/nrkno/sofie-monitor',
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe('GET /serverVersions', () => {
	it('should contain body with version in it', async () => {
		;(fetch as any).mockReturnValue(Promise.resolve(new Response(JSON.stringify(exampleHealth))))
		const response = await request(app).get('/serverVersions?servers=localhost:3000')

		expect(response.statusCode).toBe(200)

		const dom = new JSDOM(response.text)
		expect(dom.window.document.contentType).toEqual('text/html')
		expect(dom.window.document.characterSet).toEqual('UTF-8')
		dom.window.document.getElementById('versions')

		expect(fetch).toHaveBeenCalledTimes(2)
		expect(fetch).toHaveBeenNthCalledWith(1, 'http://localhost:3000/health', {
			method: 'GET',
		})
		expect(fetch).toHaveBeenNthCalledWith(2, 'http://localhost:3000/external/sisyfos/health', {
			method: 'GET',
		})
	})
})
