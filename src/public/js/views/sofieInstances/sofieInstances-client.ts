document.addEventListener('submit', (event: Event) => {
	if (event.target instanceof HTMLFormElement && event.target.name === 'add-sofie-instance') {
		event.preventDefault()
		const form: HTMLFormElement = event.target
		const { action, method } = form

		const url = (form.elements.namedItem('url') as HTMLInputElement).value
		const body = new URLSearchParams({ url })
		void fetch(action, { method, body }).then(() => {
			// tslint:disable-next-line: deprecation
			window.location.reload()
		})
	}
})
