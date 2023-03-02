// eslint-disable-next-line node/no-missing-import
import { callAsyncAsCallback } from '../../utils/callAsyncAsCallback.js'
// eslint-disable-next-line node/no-missing-import
import { findParent } from '../../utils/dom.js'

export { init }

function init(): void {
	document.addEventListener('click', toggleAllMessageTargetsHandler)
	document.addEventListener('click', messageTargetClickHandler)
	document.addEventListener('click', criticalityClickHandler)
	document.addEventListener('submit', (event) => callAsyncAsCallback(formSubmitHandler, undefined, event))
}

function toggleAllMessageTargetsHandler(event: Event) {
	if (event.target instanceof HTMLInputElement && event.target.id === 'toggle-send-to-all') {
		const { checked } = event.target
		const targetContainer = document.querySelector('#valid-message-targets')

		if (targetContainer) {
			targetContainer.querySelectorAll<HTMLInputElement>('.message-target').forEach((checkbox) => {
				if (checked) {
					if (checkbox.checked) {
						checkbox.dataset.individuallyChecked = 'true'
					}
					checkbox.checked = true
				} else {
					checkbox.checked = checkbox.dataset.individuallyChecked === 'true'
					delete checkbox.dataset.individuallyChecked
				}
			})
			resetMessageTargetValidation(targetContainer)
		}
	}
}

function messageTargetClickHandler(event: Event) {
	const { target } = event
	if (target instanceof HTMLInputElement && target.name === 'messageTarget') {
		const allToggle: HTMLInputElement | null = document.querySelector('#toggle-send-to-all')
		if (allToggle) {
			allToggle.checked = false
		}
		resetMessageTargetValidation(target)
	}
}

function criticalityClickHandler(event: Event) {
	const DEFAULT_BUTTON_CLASSNAME = 'btn-default'
	const ACTIVE_LABEL_CLASSNAME = 'active'
	const GROUP_CONTAINER_CLASSNAME = 'criticality-selector'
	const OPTION_CONTAINER_CLASSNAME = 'criticality-selector-option'

	if (event.target instanceof HTMLInputElement && event.target.name === 'criticality') {
		const container = findParent(event.target, { classNames: [GROUP_CONTAINER_CLASSNAME] })

		container?.querySelectorAll(`.${OPTION_CONTAINER_CLASSNAME}`).forEach((option: Element) => {
			const label: HTMLLabelElement | null = option.querySelector('label')
			const radioButton: HTMLInputElement | null | undefined = label?.querySelector('input[type=radio]')
			const textLabel: HTMLSpanElement | null | undefined = label?.querySelector('span')

			const selected = radioButton && radioButton.checked
			const labelActiveClassName = label?.dataset.activeClassName
			const textLabelInactiveClassName = textLabel?.dataset.inactiveClassName

			if (selected && labelActiveClassName && textLabelInactiveClassName) {
				label?.classList.add(labelActiveClassName, ACTIVE_LABEL_CLASSNAME)
				label?.classList.remove(DEFAULT_BUTTON_CLASSNAME)
				textLabel?.classList.remove(textLabelInactiveClassName)
			} else if (labelActiveClassName && textLabelInactiveClassName) {
				label?.classList.add(DEFAULT_BUTTON_CLASSNAME)
				label?.classList.remove(labelActiveClassName, ACTIVE_LABEL_CLASSNAME)
				textLabel?.classList.add(textLabelInactiveClassName)
			}
		})
	}
}

async function formSubmitHandler(event: Event) {
	if (event.target instanceof HTMLFormElement && event.target.name === 'post-service-message') {
		event.preventDefault()
		const form: HTMLFormElement = event.target
		const { action, method } = form

		const message = (form.elements.namedItem('message') as HTMLInputElement).value
		const criticality = (form.elements.namedItem('criticality') as HTMLInputElement).value
		const messageTargets = getArrayForFormElement(form, 'messageTarget')
			.filter((i) => i.checked === true)
			.map((i) => i.value)
		if (!messageTargets.length) {
			findParent(form.querySelector('#valid-message-targets'), {
				classNames: ['form-group'],
			})?.classList.add('has-error')

			return
		}

		const body = new URLSearchParams()
		body.append('criticality', criticality)
		body.append('message', message)
		messageTargets.forEach((messageTarget) => body.append('messageTarget', messageTarget))
		await fetch(action, { method, body })
		window.location.reload()
	}
}

function resetMessageTargetValidation(element: Element) {
	const group = findParent(element, {
		classNames: ['form-group'],
	})
	if (group) {
		group.classList.remove('has-error')
	}
}

function getArrayForFormElement(form: HTMLFormElement, name: string): Array<HTMLInputElement> {
	const namedItem = form.elements.namedItem(name)
	if (namedItem instanceof Element) {
		return [namedItem as HTMLInputElement]
	}

	return namedItem ? Array.from(namedItem).map((item) => item as HTMLInputElement) : []
}
