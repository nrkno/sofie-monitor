// eslint-disable-next-line node/no-missing-import
import { findParent } from './utils/dom.js'
// eslint-disable-next-line node/no-missing-import
import { init as initServiceMessages } from './views/serviceMessages/serviceMessages-client.js'
// eslint-disable-next-line node/no-missing-import
import './views/sofieInstances/sofieInstances-client.js'
// eslint-disable-next-line node/no-missing-import
import './views/coreControl/coreControl-client.js'

if (document.forms.namedItem('post-service-message')) {
	initServiceMessages()
}

// generalized handler for api actions (see /src/api/ for the actual api)

document.addEventListener('click', async (event: Event) => {
	if (event.target instanceof HTMLElement && event.target.dataset.apiAction) {
		const { location, method } = event.target.dataset
		if (location) {
			await fetch(location, { method })
			window.location.reload()
		}
	}
})

document.addEventListener('change', (event: Event) => {
	if (
		event.target instanceof HTMLInputElement &&
		event.target.willValidate &&
		event.target.form &&
		'skipValidate' in event.target.dataset === false
	) {
		const input = event.target
		const isValid = input.checkValidity()
		const parentGroup = findParent(input, { classNames: ['form-group'] })
		if (parentGroup) {
			parentGroup.classList.remove(isValid ? 'has-error' : 'has-success')
			parentGroup.classList.add(isValid ? 'has-success' : 'has-error')
		}
	}
})
