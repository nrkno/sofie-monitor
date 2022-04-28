import { Request, Response } from 'express'
import semver from 'semver'
import { getAllInstances } from '../data/sofieInstances/api'
import { getQuerystringParamValues, getServerData } from '../lib/lib'
import { RequestWithTimer } from '../RequestExtension'

interface Versions {
	[versionName: string]: {
		bold: boolean
		text: string
	}
}

function compileVersions(component: any, prefix = ''): Versions {
	const versions: Versions = {}

	const vs = (component._internal || {}).versions || {}
	Object.keys(vs).forEach((key) => (versions[prefix + key] = { text: vs[key], bold: false }))

	if (component.components && component.components.length) {
		component.components.forEach((child: any) => {
			const compiledVersions = compileVersions(child, '~' + child.name + '.')
			Object.keys(compiledVersions).forEach((key) => (versions[key] = compiledVersions[key]))
		})
	}
	return versions
}

function parseServerResponsesToVersions(responses: any[]) {
	const versionColumns: { [versionName: string]: true } = {}
	const maxVersions: { [versionName: string]: string } = {}

	const serverVersions: any[] = responses.map((resp: any) => {
		if (resp.error) {
			return {
				host: resp._host,
				error: resp,
			}
		}
		const versions = compileVersions(resp)

		Object.keys(versions).forEach((key) => {
			versionColumns[key] = true
			const currentVersionCheck = semver.coerce(versions[key].text) || '0.0.0'
			maxVersions[key] = semver.gt(semver.coerce(maxVersions[key]) || '0.0.0', currentVersionCheck)
				? maxVersions[key]
				: versions[key].text
		})

		return {
			host: resp._host,
			name: resp.name,
			instanceId: resp.instanceId,
			status: resp.status,
			versions: versions,
			// TODO: because the components have been re-structured, we will not detect changes between components.
			// components: (resp.components || []).map((component: any) => {
			// 	return {
			// 		name: component.name,
			// 		versions: JSON.stringify((component._internal || {}).versions || {})
			// 	}
			// })
		}
	})
	;(serverVersions || []).forEach((server: any) => {
		if (server && server.versions) {
			Object.keys(server.versions).forEach((key) => {
				if (server.versions[key] && server.versions[key].text !== maxVersions[key]) {
					server.versions[key].bold = true
				}
			})
		}
	})

	return {
		servers: serverVersions,
		versionColumns: Object.keys(versionColumns).sort(),
	}
}

export async function serverVersions(req: RequestWithTimer, res: Response) {
	const hosts = []
	for (const value of getQuerystringParamValues(req as Request, 'servers')) {
		if (value.trim()) {
			hosts.push(...value.split(','))
		}
	}

	if (!hosts.length) {
		const instances = await getAllInstances()
		for (const instance of instances) {
			hosts.push(instance.url.href)
		}
	}

	if (hosts.length) {
		try {
			const responses = await getServerData(hosts)
			const versions = parseServerResponsesToVersions(responses)

			res.render('serverVersions', {
				title: 'Server Versions',
				servers: versions.servers,
				columns: versions.versionColumns,
				req: req,
				refreshTimer: req.refreshTimer,
			})
		} catch (error: any) {
			console.error(error)
			res.status(500).send(error.message)
		}
	} else {
		res.status(400).send('No server provided. Please add ?servers=')
	}
}
