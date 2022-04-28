export { findParent }

export interface QueryCriteria {
	classNames?: Array<string>
}

/**
 * Finds a parent element that satisfies all the query criteria given
 *
 * @param element the element to start searching from
 * @param queryCriteria the search criteria
 * @returns an element if found or null if no parent element satisfies the query criteria
 */
function findParent(element: Element | undefined | null, queryCriteria: QueryCriteria): Element | null {
	const { classNames } = queryCriteria

	if (!element) {
		return null
	}

	while (element.parentElement) {
		element = element.parentElement
		const found =
			classNames?.reduce((containsAll, currentClassName) => {
				return Boolean(containsAll && element?.classList.contains(currentClassName))
			}, true) || false

		if (found) {
			return element
		}
	}

	return null
}
