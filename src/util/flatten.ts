export { flatten }

/**
 * Takes any value and outputs a string representation of it. In case of objects
 * it will flatten all properties recursively down to strings.
 * This is intended for debugging/logging use only.
 *
 * @param input whatever you'd like to print as a simple string
 * @returns a string representing the value of the input
 */
function flatten<T>(input: T, includeInherited?: boolean): string {
	if (typeof input === 'object') {
		const props = []
		for (const name in input) {
			if (!includeInherited && !Object.prototype.hasOwnProperty.call(input, name)) {
				continue
			}
			props.push(`${name}:${typeof input[name]} : ${flatten(input[name])}`)
		}

		return `{\n${props.join(',\n')}\n}`
	}

	return `${typeof input}:${input}`
}
