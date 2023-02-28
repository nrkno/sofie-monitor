const CLASSNAME_ENABLE_DISABLE_BUTTON = 'rk-online-offline-control'

document.addEventListener('click', (event) => void coreControlEnableDisableSubDevicesClickHandler(event))

async function coreControlEnableDisableSubDevicesClickHandler(event: MouseEvent): Promise<void> {
	if (!(event.target instanceof HTMLElement && event.target.classList.contains(CLASSNAME_ENABLE_DISABLE_BUTTON))) {
		return
	}

	try {
		const disablePayloads = JSON.parse(event.target.dataset.disablePayloads || '')

		if (Array.isArray(disablePayloads)) {
			for (const payload of disablePayloads) {
				await postPayload(payload)
			}
		}

		const enablePayloads = JSON.parse(event.target.dataset.enablePayloads || '')

		if (Array.isArray(enablePayloads)) {
			for (const payload of enablePayloads) {
				await postPayload(payload)
			}
		} else {
			console.warn('No enable payloads found when enabling peripheral subdevices')
		}
	} catch (err: any) {
		console.error(err)
	}
}

async function postPayload(payload: any): Promise<void> {
	await fetch('/api/coreControl/peripheralDevice/subDevice/setState', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})
}
